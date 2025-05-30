import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Telegraf } from 'telegraf';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BotEntity } from '../entities/bots/Bot';
import { BotCategoryEntity } from '../entities/bots/BotCategory';
import { BotButtonEntity } from '../entities/bots/BotButton';
import { BotType } from '../types/BotTypes';
import { CreateBotDto } from './dto/create-bot.dto';
import { CategoriesService } from '../categories/categories.service';
import { BotsHandler } from './bot.handler';
import { ClientsService } from '../clients/clients.service';
import { InputMediaPhoto } from 'telegraf/types';

@Injectable()
export class BotsService {
  bots: BotType[] = [];

  constructor(
    @InjectRepository(BotEntity)
    private readonly botRepository: Repository<BotEntity>,
    @InjectRepository(BotCategoryEntity)
    private readonly botCategoryRepository: Repository<BotCategoryEntity>,
    @InjectRepository(BotButtonEntity)
    private readonly botButtonRepository: Repository<BotButtonEntity>,
    @Inject(forwardRef(() => CategoriesService))
    private readonly categoriesService: CategoriesService,
    private readonly botsHandler: BotsHandler,
    private readonly clientsService: ClientsService,
  ) {
    this.init().then(() => 'bots init');
  }

  async init() {
    const data = await this.botRepository.find({
      relations: {
        category: { buttons: true },
      },
    });
    for (const bot of data) {
      const botItem: BotType = {
        botInstance: new Telegraf(bot.token),
        ...bot,
        status: 'stopped',
      };
      try {
        const res = await (
          await fetch(`https://api.telegram.org/bot${bot.token}/getMe`)
        ).json();
        if (res.ok) {
          this.botsHandler.addAllHandlers(botItem);
          botItem.botInstance.launch();
          botItem.status = 'started';
        }
      } catch (e) {
        console.log(`cant run bot ${botItem.name}(${botItem.token})`);
      }
      this.bots.push(botItem);
    }
  }

  async addBot(bot: BotEntity) {
    const botItem: BotType = {
      botInstance: new Telegraf(bot.token),
      ...bot,
      status: 'stopped',
    };
    await this.botsHandler.addAllHandlers(botItem);
    botItem.botInstance.launch();
    botItem.status = 'started';
    this.bots.push(botItem);
  }

  async create(data: CreateBotDto) {
    const category = await this.categoriesService.getCategory(data.category_id);
    if (!category) {
      throw new BadRequestException('Category not found');
    }
    const checkBot = await this.botRepository.findOne({
      where: { token: data.token },
    });
    if (checkBot) {
      throw new BadRequestException(`Bot with this token already exists`);
    }
    const bot = await this.botRepository.save({
      token: data.token,
      name: data.name,
      category: category,
      startWithServer:
        typeof data.startWithServer == 'boolean' ? data.startWithServer : true,
    });
    await this.addBot(bot);
    return bot;
  }

  async getAll(
    perPage: number | null,
    page: number | null,
    take_all: string | null,
    select: string[] | null,
    includeRelations: string | null,
  ) {
    const include =
      typeof includeRelations === 'string' ? includeRelations == 'true' : true;
    const offset =
      typeof perPage == 'number' && typeof page == 'number'
        ? (page - 1) * perPage
        : 0;
    let selectArr = [];
    if (select) {
      selectArr = [...select];
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    if (take_all === 'true' || take_all === true) {
      return await this.botRepository.find({
        select: selectArr.length > 0 ? selectArr : undefined,
        relations: { category: include ? { buttons: true } : false },
      });
    }
    return await this.botRepository.find({
      take: typeof perPage == 'number' ? perPage : 10,
      skip: offset,
      relations: { category: include },
      select: selectArr.length > 0 ? selectArr : undefined,
    });
  }

  async getBot(id: number) {
    return await this.botRepository.findOne({
      where: { id: id },
      relations: { category: { buttons: true } },
    });
  }

  async deleteBot(id: number) {
    const bot = this.bots.find((bot) => bot.id === id);
    try {
      if (bot && bot.botInstance) bot.botInstance.stop();
    } catch (e) {
      console.log('Bot not running');
    }
    return await this.botRepository.delete({ id: id });
  }

  async stop(id: number) {
    const bot = this.bots.find((bot) => bot.id === id);
    if (bot && bot.botInstance !== null && bot.status == 'started') {
      bot.botInstance.stop();
      bot.status = 'stopped';
      return true;
    }
    return false;
  }

  async start(id: number) {
    const bot = this.bots.find((bot) => bot.id === id);
    if (bot && (bot.botInstance === null || bot.status === 'stopped')) {
      bot.botInstance.launch();
      bot.status = 'started';
      return true;
    }
    return false;
  }

  async reboot(id: number) {
    const bot = this.bots.find((bot) => bot.id === id);
    if (bot) {
      if (bot.botInstance !== null && bot.status == 'started')
        bot.botInstance.stop();
      bot.botInstance = new Telegraf(bot.token);
      await this.botsHandler.addAllHandlers(bot);
      bot.botInstance.launch();
      bot.status = 'started';
      return true;
    }
    return false;
  }

  private getBotByCategory(categoryId: number) {
    const bots = this.bots.find(
      (bot) => bot.category_id === Number(categoryId),
    );
    return bots;
  }

  private getBotById(id: number) {
    const bots = this.bots.find((bot) => bot.id === Number(id));
    return bots;
  }

  async sendMessage(
    categoryId: number,
    message: string,
    files?: Express.Multer.File[],
    buttons?: string,
    buttonsMessageTitle?: string,
  ) {
    const parsedButtons = buttons ? JSON.parse(buttons) : [];

    // Налаштування для rate limiting
    const DELAY_BETWEEN_MESSAGES = 100; // мс між повідомленнями для одного бота
    const DELAY_BETWEEN_BOTS = 50; // мс між ботами
    const REQUEST_TIMEOUT = 10000; // 10 секунд тайм-аут для кожного запиту
    const MAX_CONCURRENT_BOTS = 5; // максимум одночасних ботів

    try {
      const clients = await this.clientsService.findByCategory(
        Number(categoryId),
      );

      if (!clients.length) {
        console.log(`No clients found for category ${categoryId}`);
        return;
      }

      // Створюємо масив усіх завдань для відправки
      const sendTasks = [];

      for (const client of clients) {
        if (!client.chat_id) continue;

        for (const botEntity of client.bots || []) {
          const bot = this.getBotById(botEntity.id);
          if (!bot) continue;

          sendTasks.push({
            client,
            bot,
            botEntity,
          });
        }
      }

      // Функція для відправки повідомлення з тайм-аутом
      const sendWithTimeout = async (task, delay = 0) => {
        if (delay > 0) {
          await this.sleep(delay);
        }

        return Promise.race([
          this.sendSingleMessage(
            task.client,
            task.bot,
            task.botEntity,
            message,
            files,
            parsedButtons,
            buttonsMessageTitle,
          ),
          this.createTimeoutPromise(REQUEST_TIMEOUT),
        ]);
      };

      // Обробляємо завдання батчами для контролю навантаження
      const results = [];
      for (let i = 0; i < sendTasks.length; i += MAX_CONCURRENT_BOTS) {
        const batch = sendTasks.slice(i, i + MAX_CONCURRENT_BOTS);

        const batchPromises = batch.map((task, index) =>
          sendWithTimeout(task, index * DELAY_BETWEEN_BOTS),
        );

        const batchResults = await Promise.allSettled(batchPromises);
        results.push(...batchResults);

        // Затримка між батчами, якщо є ще завдання
        if (i + MAX_CONCURRENT_BOTS < sendTasks.length) {
          await this.sleep(DELAY_BETWEEN_MESSAGES);
        }
      }

      // Логування результатів
      const successful = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.length - successful;

      console.log(
        `Message sending completed: ${successful} successful, ${failed} failed out of ${results.length} total`,
      );

      return true;
    } catch (error) {
      console.error('sendMessage error:', error);
      return new Error('send message error');
    }
  }

  // Допоміжний метод для відправки одного повідомлення
  private async sendSingleMessage(
    client: any,
    bot: any,
    botEntity: any,
    message: string,
    files?: Express.Multer.File[],
    parsedButtons?: any[],
    buttonsMessageTitle?: string,
  ) {
    try {
      let replyMarkup;
      if (parsedButtons && parsedButtons.length) {
        replyMarkup = {
          inline_keyboard: parsedButtons.map((btn) => [
            {
              text: btn.title,
              url: btn.link,
            },
          ]),
        };
      }

      if (files && files.length > 0) {
        if (files.length === 1) {
          await bot.botInstance.telegram.sendPhoto(
            client.chat_id,
            { source: Buffer.from(files[0].buffer) },
            {
              caption: message,
              parse_mode: 'HTML',
              ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
            },
          );
        } else {
          const mediaGroup: InputMediaPhoto[] = files.map((file, index) => ({
            type: 'photo',
            media: { source: Buffer.from(file.buffer) },
            ...(index === files.length - 1
              ? { caption: message, parse_mode: 'HTML' }
              : {}),
          }));

          await bot.botInstance.telegram.sendMediaGroup(
            client.chat_id,
            mediaGroup,
          );

          if (replyMarkup) {
            // Додаткова затримка перед відправкою кнопок після media group
            await this.sleep(200);
            await bot.botInstance.telegram.sendMessage(
              client.chat_id,
              buttonsMessageTitle || '🔗.',
              {
                reply_markup: replyMarkup,
              },
            );
          }
        }
      } else {
        await bot.botInstance.telegram.sendMessage(client.chat_id, message, {
          parse_mode: 'HTML',
          ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
        });
      }

      return { success: true, client: client.username, bot: botEntity.id };
    } catch (error) {
      console.error(
        `Error sending message to ${client.username} via bot ${botEntity.id}:`,
        error,
      );

      // Якщо помилка rate limit, збільшуємо затримку
      if (error.response?.error_code === 429) {
        const retryAfter = error.response.parameters?.retry_after || 1;
        console.log(`Rate limited, waiting ${retryAfter} seconds before retry`);
        await this.sleep(retryAfter * 1000);

        // Повторна спроба
        return this.sendSingleMessage(
          client,
          bot,
          botEntity,
          message,
          files,
          parsedButtons,
          buttonsMessageTitle,
        );
      }

      throw error;
    }
  }

  // Допоміжний метод для створення тайм-ауту
  private createTimeoutPromise(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Request timeout after ${ms}ms`));
      }, ms);
    });
  }

  // Допоміжний метод для затримки
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async getStatus(id: number) {
    const bot = this.bots.find((bot) => bot.id === id);
    if (bot) {
      return bot.status;
    }
    return undefined;
  }

  getBotsByCategory(categoryId: number): BotType[] | undefined {
    return this.bots.filter((bot) => bot.category_id === categoryId);
  }
}
