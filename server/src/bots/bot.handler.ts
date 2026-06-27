import { Injectable } from '@nestjs/common';
import { BotType } from '../types/BotTypes';
import { Markup } from 'telegraf';
import { ClientsService } from '../clients/clients.service';
import { CreateClientDto } from '../clients/dto/create-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DiscoveredChatEntity } from '../entities/bots/DiscoveredChat';
import { Repository } from 'typeorm';

@Injectable()
export class BotsHandler {
  // In-memory кеш уже записаних пар «бот:чат», щоб НЕ робити запит до БД на
  // КОЖНЕ вхідне повідомлення в групі/каналі. Без цього активні групи створюють
  // шторм DB-запитів, який конкурує з розсилкою і призводить до тайм-аутів
  // (частина повідомлень користувачам не доходить).
  private readonly seenChats = new Set<string>();

  constructor(
    private readonly clientsService: ClientsService,
    @InjectRepository(DiscoveredChatEntity)
    private readonly discoveredChatRepository: Repository<DiscoveredChatEntity>,
  ) {}

  async start(bot: BotType) {
    bot.botInstance.start(async (ctx) => {
      // Реєстрацію клієнта робимо у ФОНІ — щоб повільна БД під навантаженням
      // не блокувала відповідь і не впиралась у handlerTimeout (30с).
      this.registerClient(bot, ctx).catch((e) =>
        console.log('registerClient error', e?.message || e),
      );

      // Привітання відправляємо одразу (швидкий шлях).
      try {
        await this.sendWelcome(bot, ctx);
      } catch (e) {
        console.log('welcome error', e?.message || e);
      }
    });
  }

  private async registerClient(bot: BotType, ctx: any) {
    const from = ctx.message.from;
    const data: CreateClientDto = {
      name: `${from.first_name ? from.first_name : ''}${from.last_name ? ' ' + from.last_name : ''}`,
      username: from.username,
      category_id: bot.category_id,
      chat_id: from.id,
      bot_id: bot.id,
    };
    await this.clientsService.create(data);
  }

  private async sendWelcome(bot: BotType, ctx: any) {
    const buttons = [];
    (bot.category?.buttons || []).forEach((button) => {
      buttons.push([Markup.button.url(button.title, button.link)]);
    });

    const extra = {
      caption: bot.category?.text,
      parse_mode: 'HTML' as const,
      ...Markup.inlineKeyboard(buttons),
    };

    // Перший раз вантажимо з URL і запам'ятовуємо file_id; далі шлемо by file_id
    // (миттєво, без повторного завантаження картинки Telegram-ом).
    const photo = bot.welcomePhotoFileId
      ? bot.welcomePhotoFileId
      : { url: bot.category.image_link };

    const sent: any = await ctx.sendPhoto(photo, extra);

    if (!bot.welcomePhotoFileId && sent?.photo?.length) {
      bot.welcomePhotoFileId = sent.photo[sent.photo.length - 1].file_id;
    }
  }

  // Зберігаємо/оновлюємо чат, який бот «побачив». Telegram Bot API не дозволяє
  // отримати список чатів бота, тож накопичуємо їх з оновлень.
  private async upsertDiscoveredChat(
    bot: BotType,
    chat: { id: number; type: string; title?: string; username?: string },
    status: string,
  ) {
    if (
      !chat ||
      (chat.type !== 'group' &&
        chat.type !== 'supergroup' &&
        chat.type !== 'channel')
    ) {
      return;
    }
    try {
      const chatId = String(chat.id);
      const existing = await this.discoveredChatRepository.findOne({
        where: { bot_id: bot.id, chat_id: chatId },
      });
      const payload = {
        bot_id: bot.id,
        category_id: bot.category_id,
        chat_id: chatId,
        title: chat.title ?? existing?.title ?? null,
        username: chat.username ?? existing?.username ?? null,
        type: chat.type,
        status,
      };
      if (existing) {
        await this.discoveredChatRepository.update({ id: existing.id }, payload);
      } else {
        await this.discoveredChatRepository.save(payload);
      }
    } catch (e) {
      console.log('upsertDiscoveredChat error', e?.message || e);
    }
  }

  // Зміна статусу самого бота в чаті (додали / зробили адміном / видалили).
  // Подія рідкісна, тож завжди оновлюємо БД authoritatively та кеш.
  private myChatMember(bot: BotType) {
    bot.botInstance.on('my_chat_member', async (ctx) => {
      try {
        const update = ctx.myChatMember;
        const status = update.new_chat_member?.status;
        const chat = update.chat as any;
        await this.upsertDiscoveredChat(bot, chat, status);
        const key = `${bot.id}:${chat?.id}`;
        if (status === 'left' || status === 'kicked') {
          this.seenChats.delete(key);
        } else {
          this.seenChats.add(key);
        }
      } catch (e) {
        console.log(e);
      }
    });
  }

  // Будь-яка активність у групі/каналі підтверджує, що бот там присутній.
  // Пишемо в БД лише ОДИН раз на пару «бот:чат» за час роботи процесу —
  // решта повідомлень обробляються без жодного запиту до БД.
  private chatActivity(bot: BotType) {
    bot.botInstance.on(['message', 'channel_post'], async (ctx, next) => {
      try {
        const chat = ctx.chat as any;
        if (
          chat &&
          (chat.type === 'group' ||
            chat.type === 'supergroup' ||
            chat.type === 'channel')
        ) {
          const key = `${bot.id}:${chat.id}`;
          if (!this.seenChats.has(key)) {
            // Позначаємо одразу, щоб паралельні апдейти не дублювали запис.
            this.seenChats.add(key);
            await this.upsertDiscoveredChat(bot, chat, 'member');
          }
        }
      } catch (e) {
        console.log(e);
      }
      // Не блокуємо інші обробники (зокрема /start у приватних чатах).
      return next();
    });
  }

  async addAllHandlers(bot: BotType) {
    // КРИТИЧНО: без власного обробника помилок Telegraf за замовчуванням
    // перекидає помилку далі. Тайм-аут обробника (handlerTimeout) тоді стає
    // незловленим виключенням і КРАШИТЬ весь процес — падають усі боти.
    // bot.catch гарантує, що будь-яка помилка/тайм-аут лише логуються.
    bot.botInstance.catch((err: any, ctx) => {
      console.error(
        `Bot ${bot.name} (${bot.id}) handler error on update ${ctx?.update?.update_id}:`,
        err?.message || err,
      );
    });
    await this.start(bot);
    this.myChatMember(bot);
    this.chatActivity(bot);
  }
}
