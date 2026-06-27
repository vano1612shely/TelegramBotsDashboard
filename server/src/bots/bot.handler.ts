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
      try {
        const data: CreateClientDto = {
          name: `${ctx.message.from.first_name ? ctx.message.from.first_name : ''}${ctx.message.from.last_name ? ' ' + ctx.message.from.last_name : ''}`,
          username: ctx.message.from.username,
          category_id: bot.category_id,
          chat_id: ctx.message.from.id,
          bot_id: bot.id,
        };
        await this.clientsService.create(data);

        const buttons = [];
        bot.category.buttons.map((button) => {
          buttons.push([Markup.button.url(button.title, button.link)]);
        });
        await ctx.sendPhoto(
          { url: bot.category.image_link },
          {
            caption: bot.category.text,
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard(buttons),
          },
        );
      } catch (e) {
        console.log(e);
      }
    });
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
    await this.start(bot);
    this.myChatMember(bot);
    this.chatActivity(bot);
  }
}
