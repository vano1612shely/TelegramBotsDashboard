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
      // try {
      //   const res = await (
      //     await fetch(`https://api.telegram.org/bot${bot.token}/getMe`)
      //   ).json();
      //   if (res.ok) {
      //     this.botsHandler.addAllHandlers(botItem);
      //     botItem.botInstance.launch();
      //     botItem.status = 'started';
      //   }
      // } catch (e) {
      //   console.log(`cant run bot ${botItem.name}(${botItem.token})`);
      // }
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

    // Налаштування для rate limiting та паралелізму
    const DELAY_BETWEEN_MESSAGES = 100; // мс між повідомленнями
    const DELAY_BETWEEN_BOTS = 50; // мс між ботами
    const REQUEST_TIMEOUT = 8000; // 8 секунд тайм-аут
    const MAX_CONCURRENT_THREADS = 3; // кількість паралельних потоків
    const MESSAGES_PER_THREAD = 5; // повідомлень на потік одночасно

    try {
      const clients = await this.clientsService.getAll(
        null,
        null,
        'true',
        null,
        null,
      );

      if (!clients.length) {
        console.log(`No clients found`);
        return;
      }

      const bots = this.getBotsByCategory(categoryId);

      if (!bots.length) {
        console.log('No bots available');
        return;
      }

      console.log(
        `Starting message sending: ${bots.length} bots, ${clients.length} clients`,
      );
      const allTasks = [];
      for (const { botInstance } of bots) {
        for (const client of clients) {
          if (!client.chat_id) continue;

          allTasks.push({
            botInstance,
            client,
          });
        }
      }

      // Розділяємо завдання на потоки
      const chunks = this.chunkArray(
        allTasks,
        Math.ceil(allTasks.length / MAX_CONCURRENT_THREADS),
      );

      // Запускаємо потоки паралельно
      const threadPromises = chunks.map((chunk, threadIndex) =>
        this.processThread(
          chunk,
          threadIndex,
          message,
          files,
          parsedButtons,
          buttonsMessageTitle,
          {
            DELAY_BETWEEN_MESSAGES,
            DELAY_BETWEEN_BOTS,
            REQUEST_TIMEOUT,
            MESSAGES_PER_THREAD,
          },
        ),
      );

      const threadResults = await Promise.allSettled(threadPromises);

      // Збираємо статистику
      let totalSuccessful = 0;
      let totalFailed = 0;
      let totalProcessed = 0;

      threadResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const stats = result.value;
          totalSuccessful += stats.successful;
          totalFailed += stats.failed;
          totalProcessed += stats.processed;
          console.log(
            `Thread ${index}: ${stats.successful} successful, ${stats.failed} failed`,
          );
        } else {
          console.error(`Thread ${index} failed:`, result.reason);
        }
      });

      console.log(
        `Total: ${totalSuccessful} successful, ${totalFailed} failed, ${totalProcessed} processed`,
      );

      return true;
    } catch (error) {
      console.error('sendMessage error:', error);
      return new Error('send message error');
    }
  }

  // Обробка одного потоку
  private async processThread(
    tasks: any[],
    threadIndex: number,
    message: string,
    files?: Express.Multer.File[],
    parsedButtons?: any[],
    buttonsMessageTitle?: string,
    config?: any,
  ) {
    const stats = { successful: 0, failed: 0, processed: 0 };

    // Обробляємо завдання батчами в межах потоку
    for (let i = 0; i < tasks.length; i += config.MESSAGES_PER_THREAD) {
      const batch = tasks.slice(i, i + config.MESSAGES_PER_THREAD);

      const batchPromises = batch.map(async (task, index) => {
        // Додаємо затримку для розподілу навантаження
        const delay = threadIndex * 100 + index * config.DELAY_BETWEEN_MESSAGES;
        await this.sleep(delay);

        return this.sendWithRetry(
          task,
          message,
          files,
          parsedButtons,
          buttonsMessageTitle,
          config.REQUEST_TIMEOUT,
        );
      });

      const batchResults = await Promise.allSettled(batchPromises);

      // Підраховуємо результати батчу
      batchResults.forEach((result) => {
        stats.processed++;
        if (result.status === 'fulfilled' && result.value?.success) {
          stats.successful++;
        } else {
          stats.failed++;
        }
      });

      // Затримка між батчами в потоці
      if (i + config.MESSAGES_PER_THREAD < tasks.length) {
        await this.sleep(config.DELAY_BETWEEN_BOTS);
      }
    }

    return stats;
  }

  // Відправка з повторними спробами та обробкою помилок
  private async sendWithRetry(
    task: any,
    message: string,
    files?: Express.Multer.File[],
    parsedButtons?: any[],
    buttonsMessageTitle?: string,
    timeout: number = 8000,
    maxRetries: number = 1,
  ): Promise<{ success: boolean; error?: any }> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await Promise.race([
          this.sendSingleMessage(
            task.client,
            task.botInstance,
            message,
            files,
            parsedButtons,
            buttonsMessageTitle,
          ),
          this.createTimeoutPromise(timeout),
        ]);

        return { success: true, ...result };
      } catch (error) {
        // Обробляємо різні типи помилок
        if (error.response?.error_code === 429) {
          // Rate limit - чекаємо та повторюємо
          const retryAfter = Math.min(
            error.response.parameters?.retry_after || 1,
            10,
          );
          await this.sleep(retryAfter * 1000);
          continue;
        }
        console.log(error.response);
        if (error.response?.error_code === 403) {
          // Бот заблокований користувачем - пропускаємо
          return { success: false, error: 'Bot blocked by user' };
        }

        if (error.response?.error_code === 400) {
          // Неправильні дані - пропускаємо
          return { success: false, error: 'Bad request' };
        }

        if (error.message?.includes('timeout')) {
          // Тайм-аут - пробуємо ще раз якщо є спроби
          if (attempt < maxRetries) {
            await this.sleep(1000 * (attempt + 1)); // Експоненційна затримка
            continue;
          }
        }

        // Для останньої спроби або невідомих помилок
        if (attempt === maxRetries) {
          return { success: false, error: error.message || 'Unknown error' };
        }

        // Затримка перед повторною спробою
        await this.sleep(500 * (attempt + 1));
      }
    }

    return { success: false, error: 'Max retries exceeded' };
  }

  private async sendSingleMessage(
    client: any,
    bot: any,
    message: string,
    files?: Express.Multer.File[],
    parsedButtons?: any[],
    buttonsMessageTitle?: string,
  ) {
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
        await bot.telegram.sendPhoto(
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

        await bot.telegram.sendMediaGroup(client.chat_id, mediaGroup);

        if (replyMarkup) {
          await this.sleep(100);
          await bot.telegram.sendMessage(
            client.chat_id,
            buttonsMessageTitle || '🔗.',
            {
              reply_markup: replyMarkup,
            },
          );
        }
      }
    } else {
      await bot.telegram.sendMessage(client.chat_id, message, {
        parse_mode: 'HTML',
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
      });
    }

    return { success: true, client: client.username };
  }

  // Допоміжні методи
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private createTimeoutPromise(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Request timeout after ${ms}ms`));
      }, ms);
    });
  }

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
    return this.bots.filter(
      (bot) => bot.category_id === categoryId && bot.status === 'started',
    );
  }
}
