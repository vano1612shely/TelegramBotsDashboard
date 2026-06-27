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
import { BotChatEntity } from '../entities/bots/BotChat';
import { DiscoveredChatEntity } from '../entities/bots/DiscoveredChat';
import { BotType } from '../types/BotTypes';
import { CreateBotDto } from './dto/create-bot.dto';
import { CategoriesService } from '../categories/categories.service';
import { BotsHandler } from './bot.handler';
import { ClientsService } from '../clients/clients.service';
import { InputMediaPhoto, InputMediaVideo } from 'telegraf/types';

export type SendTarget = 'clients' | 'chats' | 'all';

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
    @InjectRepository(BotChatEntity)
    private readonly botChatRepository: Repository<BotChatEntity>,
    @InjectRepository(DiscoveredChatEntity)
    private readonly discoveredChatRepository: Repository<DiscoveredChatEntity>,
    @Inject(forwardRef(() => CategoriesService))
    private readonly categoriesService: CategoriesService,
    private readonly botsHandler: BotsHandler,
    @Inject(forwardRef(() => ClientsService))
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
        botInstance: new Telegraf(bot.token, { handlerTimeout: 30000 }),
        ...bot,
        status: 'stopped',
      };
      try {
        const res = await (
          await fetch(`https://api.telegram.org/bot${bot.token}/getMe`)
        ).json();
        if (res.ok) {
          botItem.telegramId = res.result?.id;
          this.botsHandler.addAllHandlers(botItem);
          botItem.botInstance.launch().catch((e) => console.error(`launch error`, e?.message || e));
          botItem.status = 'started';
        }
      } catch (e) {
        console.log(`cant run bot ${botItem.name}(${botItem.token})`);
      }
      this.bots.push(botItem);
      await this.sleep(100);
    }
  }

  async addBot(bot: BotEntity) {
    const botItem: BotType = {
      botInstance: new Telegraf(bot.token, { handlerTimeout: 30000 }),
      ...bot,
      status: 'stopped',
    };
    await this.botsHandler.addAllHandlers(botItem);
    botItem.botInstance.launch().catch((e) => console.error(`launch error`, e?.message || e));
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
    // Remove junction table relations first to avoid FK errors
    const botEntity = await this.botRepository.findOne({
      where: { id },
      relations: { clients: true },
    });
    if (botEntity?.clients?.length) {
      await this.botRepository
        .createQueryBuilder()
        .relation(BotEntity, 'clients')
        .of(botEntity)
        .remove(botEntity.clients);
    }
    this.bots = this.bots.filter((item) => item.id !== id);
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
      bot.botInstance = new Telegraf(bot.token, { handlerTimeout: 30000 });
      await this.botsHandler.addAllHandlers(bot);
      bot.botInstance.launch().catch((e) => console.error(`launch error`, e?.message || e));
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
      bot.botInstance = new Telegraf(bot.token, { handlerTimeout: 30000 });
      await this.botsHandler.addAllHandlers(bot);
      bot.botInstance.launch().catch((e) => console.error(`launch error`, e?.message || e));
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
    target: SendTarget = 'clients',
    chats?: string,
  ) {
    const parsedButtons = buttons ? JSON.parse(buttons) : [];
    const providedIdentifiers = this.parseChatIdentifiers(chats);

    // Розсилка в групові чати / канали (по одному повідомленню на чат,
    // через бота категорії, який є адміном цього чату/каналу).
    if (target === 'chats' || target === 'all') {
      await this.sendMessageToChats(
        categoryId,
        message,
        files,
        parsedButtons,
        buttonsMessageTitle,
        providedIdentifiers,
      );
    }

    // Розсилка особистих повідомлень клієнтам (кожен бот -> своїм клієнтам).
    if (target === 'clients' || target === 'all') {
      await this.sendToClients(
        categoryId,
        message,
        files,
        parsedButtons,
        buttonsMessageTitle,
      );
    }

    return true;
  }

  private async sendToClients(
    categoryId: number,
    message: string,
    files: Express.Multer.File[] | undefined,
    parsedButtons: any[],
    buttonsMessageTitle: string | undefined,
  ) {
    // Налаштування для rate limiting та паралелізму
    const DELAY_BETWEEN_MESSAGES = 100; // мс між повідомленнями
    const DELAY_BETWEEN_BOTS = 50; // мс між ботами
    const REQUEST_TIMEOUT = 8000; // 8 секунд тайм-аут
    const MAX_CONCURRENT_THREADS = 3; // кількість паралельних потоків
    const MESSAGES_PER_THREAD = 5; // повідомлень на потік одночасно

    try {
      const bots = this.getBotsByCategory(categoryId);

      if (!bots.length) {
        console.log('No bots available');
        return;
      }

      console.log(`Starting message sending: ${bots.length} bots`);
      const allTasks = [];

      // Для кожного бота отримуємо тільки прив'язаних до нього клієнтів
      for (const bot of bots) {
        // Отримуємо повну інформацію про бота з прив'язаними клієнтами
        const fullBot = await this.botRepository.findOne({
          where: { id: bot.id },
          relations: { clients: true },
        });

        if (!fullBot || !fullBot.clients?.length) {
          console.log(`No clients found for bot ${bot.name} (ID: ${bot.id})`);
          continue;
        }

        // Фільтруємо клієнтів, які мають chat_id
        const validClients = fullBot.clients.filter((client) => client.chat_id);

        if (!validClients.length) {
          console.log(
            `No valid clients (with chat_id) found for bot ${bot.name} (ID: ${bot.id})`,
          );
          continue;
        }

        console.log(
          `Bot ${bot.name} (ID: ${bot.id}) has ${validClients.length} linked clients`,
        );

        // Додаємо завдання для кожної пари бот-клієнт
        for (const client of validClients) {
          allTasks.push({
            bot,
            client,
          });
        }
      }

      if (!allTasks.length) {
        console.log('No valid bot-client pairs found');
        return;
      }

      console.log(`Total tasks: ${allTasks.length}`);

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

      batchResults.forEach((result) => {
        stats.processed++;
        if (result.status === 'fulfilled' && result.value?.success) {
          stats.successful++;
        } else {
          stats.failed++;
        }
      });

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
            task.bot,
            message,
            files,
            parsedButtons,
            buttonsMessageTitle,
          ),
          this.createTimeoutPromise(timeout),
        ]);

        if (result.success) {
          await this.updateClientBotRelation(task.client, task.bot);
        }

        return result;
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
        if (error.response?.error_code === 403) {
          console.log(error.response);
          return { success: false, error: 'Bot blocked by user' };
        }

        if (error.response?.error_code === 400) {
          // Неправильні дані - пропускаємо
          return { success: false, error: 'Bad request' };
        }
        console.log(error.response);
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

  // Новий метод для оновлення зв'язків клієнт-бот
  private async updateClientBotRelation(client: any, bot: any) {
    try {
      // Отримуємо повну інформацію про клієнта з бази даних
      const fullClient = await this.clientsService.getById(client.id);

      if (!fullClient) {
        console.log(`Client with id ${client.id} not found`);
        return;
      }

      const botAlreadyLinked = fullClient.bots?.some((b) => b.id === bot.id);

      if (!botAlreadyLinked) {
        // Створюємо новий зв'язок через ClientsService
        await this.clientsService.linkBotToClient(client.id, bot.id);
        console.log(`Bot ${bot.id} linked to client ${client.id}`);
      }
    } catch (error) {
      console.error(`Error updating client-bot relation:`, error);
    }
  }

  private async sendSingleMessage(
    client: any,
    bot: any,
    message: string,
    files?: Express.Multer.File[],
    parsedButtons?: any[],
    buttonsMessageTitle?: string,
  ) {
    await this.sendContent(
      bot,
      client.chat_id,
      message,
      files,
      parsedButtons,
      buttonsMessageTitle,
    );
    return { success: true, client: client.username, botId: bot.id };
  }

  private isVideo(file: Express.Multer.File): boolean {
    return Boolean(file?.mimetype && file.mimetype.startsWith('video'));
  }

  // Передаємо filename з коректним розширенням, щоб Telegram правильно визначив
  // тип файлу. Якщо оригінальне ім'я без розширення (буває для blob/завантажень),
  // підставляємо розширення з mimetype — інакше sendPhoto може повернути
  // IMAGE_PROCESS_FAILED і фото зайве «деградує» в документ.
  private toInputFile(file: Express.Multer.File) {
    const hasExt = file.originalname && /\.[a-z0-9]{2,5}$/i.test(file.originalname);
    const filename = hasExt
      ? file.originalname
      : `file${this.extFromMime(file.mimetype)}`;
    return {
      source: Buffer.from(file.buffer),
      filename,
    };
  }

  private extFromMime(mimetype?: string): string {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'video/mp4': '.mp4',
      'video/quicktime': '.mov',
      'video/webm': '.webm',
    };
    return (mimetype && map[mimetype]) || '';
  }

  // Помилки етапу обробки зображення (завеликий файл, неприйнятні розміри,
  // формат, який Telegram не може обробити як фото).
  private isImageProcessError(e: any): boolean {
    const desc =
      e?.response?.description || e?.description || e?.message || '';
    return /IMAGE_PROCESS_FAILED|PHOTO_INVALID_DIMENSIONS|PHOTO_SAVE_FILE_INVALID|PHOTO_EXT_INVALID/i.test(
      desc,
    );
  }

  // Відправка одного файлу. Відео -> sendVideo, фото -> sendPhoto з
  // фолбеком на sendDocument, якщо Telegram не зміг обробити зображення.
  private async sendOneFile(
    telegram: any,
    chatId: string | number,
    file: Express.Multer.File,
    extra: any,
  ) {
    const input = this.toInputFile(file);
    if (this.isVideo(file)) {
      await telegram.sendVideo(chatId, input, extra);
      return;
    }
    try {
      await telegram.sendPhoto(chatId, input, extra);
    } catch (e) {
      if (this.isImageProcessError(e)) {
        // Завеликий/неформатний файл — надсилаємо як документ (без обробки).
        await telegram.sendDocument(chatId, this.toInputFile(file), extra);
      } else {
        throw e;
      }
    }
  }

  // Універсальна відправка контенту (текст / фото / відео / медіа-група)
  // у будь-який chat_id (клієнт, груповий чат або канал).
  private async sendContent(
    bot: BotType,
    chatId: string | number,
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

    const telegram = bot.botInstance.telegram;

    if (files && files.length > 0) {
      if (files.length === 1) {
        const extra = {
          caption: message,
          parse_mode: 'HTML' as const,
          ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
        };
        await this.sendOneFile(telegram, chatId, files[0], extra);
      } else {
        // Медіа-група може містити одночасно фото та відео.
        const mediaGroup = files.map((file, index) => ({
          type: this.isVideo(file) ? 'video' : 'photo',
          media: this.toInputFile(file),
          ...(index === files.length - 1
            ? { caption: message, parse_mode: 'HTML' }
            : {}),
        })) as (InputMediaPhoto | InputMediaVideo)[];

        try {
          await telegram.sendMediaGroup(chatId, mediaGroup);
        } catch (e) {
          if (this.isImageProcessError(e)) {
            // Фолбек: надсилаємо файли по одному (перший — з підписом),
            // щоб «проблемне» зображення пішло як документ.
            for (let i = 0; i < files.length; i++) {
              const fileExtra =
                i === 0
                  ? { caption: message, parse_mode: 'HTML' as const }
                  : {};
              await this.sendOneFile(telegram, chatId, files[i], fileExtra);
              await this.sleep(100);
            }
          } else {
            throw e;
          }
        }

        if (replyMarkup) {
          await this.sleep(100);
          await telegram.sendMessage(chatId, buttonsMessageTitle || '🔗.', {
            reply_markup: replyMarkup,
          });
        }
      }
    } else {
      await telegram.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
      });
    }
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
      (bot) =>
        bot.category_id === Number(categoryId) && bot.status === 'started',
    );
  }

  // ---------------------------------------------------------------------------
  // Розсилка в чати / канали
  // ---------------------------------------------------------------------------

  // Приводимо ідентифікатор до канонічного вигляду:
  // - числовий id (групи/канали) залишаємо як є;
  // - публічний канал/групу за username приводимо до @username.
  private normalizeIdentifier(raw: string): string {
    const id = (raw || '').trim();
    if (!id) return '';
    if (/^-?\d+$/.test(id)) return id;
    return id.startsWith('@') ? id : `@${id}`;
  }

  // Парсимо список ідентифікаторів: підтримуємо JSON-масив або текст,
  // розділений комами / новими рядками / пробілами.
  private parseChatIdentifiers(raw?: string): string[] {
    if (!raw) return [];
    let list: string[] = [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        list = parsed.map((item) => String(item));
      } else {
        list = String(raw).split(/[\s,]+/);
      }
    } catch {
      list = String(raw).split(/[\s,]+/);
    }
    return list
      .map((item) => this.normalizeIdentifier(item))
      .filter((item) => item.length > 0);
  }

  // Telegram id самого бота (з кешуванням).
  private async ensureBotTelegramId(bot: BotType): Promise<number | undefined> {
    if (bot.telegramId) return bot.telegramId;
    try {
      const me = await bot.botInstance.telegram.getMe();
      bot.telegramId = me.id;
    } catch (e) {
      console.log(`Cannot resolve telegram id for bot ${bot.name}`);
    }
    return bot.telegramId;
  }

  // Об'єднуємо збережені для категорії чати з переданими ad-hoc ідентифікаторами.
  private async resolveTargetIdentifiers(
    categoryId: number,
    provided: string[],
  ): Promise<string[]> {
    const saved = await this.botChatRepository.find({
      where: { category_id: Number(categoryId) },
    });
    const savedIds = saved.map((chat) => chat.identifier);
    return Array.from(new Set([...savedIds, ...provided]));
  }

  // Розсилка одного повідомлення на кожен чат/канал.
  // Для кожного цільового чату перебираємо ботів категорії і відправляємо
  // через першого, який має право публікувати (адмін). Повторів немає.
  private async sendMessageToChats(
    categoryId: number,
    message: string,
    files: Express.Multer.File[] | undefined,
    parsedButtons: any[],
    buttonsMessageTitle: string | undefined,
    providedIdentifiers: string[],
  ) {
    const identifiers = await this.resolveTargetIdentifiers(
      categoryId,
      providedIdentifiers,
    );

    if (!identifiers.length) {
      console.log('No chat/channel targets to send to');
      return { successful: 0, failed: 0 };
    }

    const bots = this.getBotsByCategory(categoryId);
    if (!bots || !bots.length) {
      console.log('No started bots for category');
      return { successful: 0, failed: identifiers.length };
    }

    let successful = 0;
    let failed = 0;

    for (const identifier of identifiers) {
      const bot = await this.resolveAdminBot(identifier, bots);
      const candidates = bot ? [bot, ...bots.filter((b) => b !== bot)] : bots;

      let sent = false;
      for (const candidate of candidates) {
        try {
          await this.sendContent(
            candidate,
            identifier,
            message,
            files,
            parsedButtons,
            buttonsMessageTitle,
          );
          sent = true;
          break;
        } catch (e) {
          // Бот не є адміном / не має прав публікації — пробуємо наступного.
          if (e?.response?.error_code === 429) {
            const retryAfter = Math.min(
              e.response.parameters?.retry_after || 1,
              10,
            );
            await this.sleep(retryAfter * 1000);
          }
        }
      }

      if (sent) {
        successful++;
      } else {
        failed++;
        console.log(`No admin bot could post to ${identifier}`);
      }

      await this.sleep(150);
    }

    console.log(`Chats broadcast: ${successful} successful, ${failed} failed`);
    return { successful, failed };
  }

  // Знаходимо бота категорії, який є адміном (creator/administrator) у чаті.
  private async resolveAdminBot(
    identifier: string,
    bots: BotType[],
  ): Promise<BotType | undefined> {
    for (const bot of bots) {
      try {
        const telegramId = await this.ensureBotTelegramId(bot);
        if (!telegramId) continue;
        const member = await bot.botInstance.telegram.getChatMember(
          identifier,
          telegramId,
        );
        if (member.status === 'creator') return bot;
        if (member.status === 'administrator') {
          // У каналах публікація вимагає can_post_messages; у групах це поле
          // відсутнє, тож адміна вважаємо придатним.
          const canPost = (member as any).can_post_messages;
          if (canPost === undefined || canPost) return bot;
        }
      } catch {
        // Бот не доданий у цей чат / немає доступу.
      }
    }
    return undefined;
  }

  // ---------- CRUD цільових чатів/каналів ----------

  async addChat(categoryId: number, identifier: string) {
    const normalized = this.normalizeIdentifier(identifier);
    if (!normalized) {
      throw new BadRequestException('Empty chat identifier');
    }

    const existing = await this.botChatRepository.findOne({
      where: { category_id: Number(categoryId), identifier: normalized },
    });
    if (existing) return existing;

    let title: string | null = null;
    let type = normalized.startsWith('@') ? 'channel' : 'group';

    // Шукаємо ПЕРШОГО бота категорії, який має доступ до чату, щоб отримати
    // назву/тип і зафіксувати чат у пулі «знайдених» (для автокомпліту).
    // Зупиняємось після першого успіху — інакше при 100+ ботах це сотні
    // викликів Telegram на один «Додати» (повільно / ризик rate limit).
    // Решта ботів-адмінів підтягнуться пасивно через оновлення Telegram,
    // а на момент відправки адмін усе одно перевіряється наживо.
    const bots = this.getBotsByCategory(categoryId);
    if (bots && bots.length) {
      for (const bot of bots) {
        try {
          const chat: any = await bot.botInstance.telegram.getChat(normalized);
          title = chat.title || chat.username || null;
          type = chat.type === 'channel' ? 'channel' : 'group';

          let status = 'member';
          try {
            const telegramId = await this.ensureBotTelegramId(bot);
            if (telegramId) {
              const member = await bot.botInstance.telegram.getChatMember(
                normalized,
                telegramId,
              );
              status = member.status;
            }
          } catch {
            // Не вдалось визначити статус — лишаємо 'member'.
          }

          await this.recordDiscoveredChat(bot, chat, status);
          break;
        } catch {
          // Цей бот не має доступу до чату — пробуємо наступного.
        }
      }
    }

    return await this.botChatRepository.save({
      category_id: Number(categoryId),
      identifier: normalized,
      title,
      type,
    });
  }

  // Зберігаємо/оновлюємо запис у пулі «знайдених» чатів (для автокомпліту).
  // Дзеркалить логіку в BotsHandler, але викликається з дій користувача
  // (додавання чату), коли бот вже точно має доступ.
  private async recordDiscoveredChat(
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
      console.log('recordDiscoveredChat error', e?.message || e);
    }
  }

  // Список цільових чатів категорії + перелік ботів-адмінів для кожного.
  // ВАЖЛИВО: лише запити до БД, БЕЗ живих викликів Telegram. Раніше тут на
  // кожен чат × кожен бот (100+) робився getChatMember у потоці запиту — це
  // підвішувало ендпоінт (нескінченний лоадер). Статус адмінів беремо зі
  // збереженого пулу DiscoveredChat.
  async getChats(categoryId: number) {
    const chats = await this.botChatRepository.find({
      where: { category_id: Number(categoryId) },
      order: { created_at: 'ASC' },
    });
    const discovered = await this.discoveredChatRepository.find({
      where: { category_id: Number(categoryId) },
    });

    return chats.map((chat) => {
      const isUsername = chat.identifier.startsWith('@');
      const uname = isUsername ? chat.identifier.slice(1).toLowerCase() : null;

      const matches = discovered.filter((d) =>
        isUsername
          ? d.username?.toLowerCase() === uname
          : d.chat_id === chat.identifier,
      );

      const adminBots = Array.from(
        new Set(
          matches
            .filter(
              (d) => d.status === 'administrator' || d.status === 'creator',
            )
            .map(
              (d) =>
                this.bots.find((b) => b.id === d.bot_id)?.name || `#${d.bot_id}`,
            ),
        ),
      );

      return { ...chat, adminBots };
    });
  }

  async deleteChat(id: number) {
    return await this.botChatRepository.delete({ id: Number(id) });
  }

  // Підказки для автокомпліту: чати/канали, які боти категорії «побачили»
  // через оновлення Telegram і де бот є учасником/адміном.
  // Дедуплікуємо за chat_id (кілька ботів категорії можуть бути в одному чаті).
  async getChatSuggestions(categoryId: number, query?: string) {
    const rows = await this.discoveredChatRepository.find({
      where: { category_id: Number(categoryId) },
      order: { updated_at: 'DESC' },
    });

    // Бот має бути активним учасником, щоб міг публікувати.
    const active = rows.filter((row) =>
      ['creator', 'administrator', 'member'].includes(row.status),
    );

    const rank = (status: string) =>
      status === 'creator' ? 3 : status === 'administrator' ? 2 : 1;

    const byChat = new Map<
      string,
      {
        identifier: string;
        chat_id: string;
        username: string | null;
        title: string | null;
        type: string;
        bestStatus: string;
        bots: string[];
      }
    >();

    for (const row of active) {
      const bot = this.bots.find((b) => b.id === row.bot_id);
      const botName = bot?.name || `#${row.bot_id}`;
      const existing = byChat.get(row.chat_id);
      if (existing) {
        if (!existing.bots.includes(botName)) existing.bots.push(botName);
        if (rank(row.status) > rank(existing.bestStatus)) {
          existing.bestStatus = row.status;
        }
        if (!existing.title && row.title) existing.title = row.title;
        if (!existing.username && row.username) existing.username = row.username;
      } else {
        byChat.set(row.chat_id, {
          // Для каналів зручніше зберігати @username, для груп — числовий id.
          identifier:
            row.type === 'channel' && row.username
              ? `@${row.username}`
              : row.chat_id,
          chat_id: row.chat_id,
          username: row.username || null,
          title: row.title || null,
          type: row.type,
          bestStatus: row.status,
          bots: [botName],
        });
      }
    }

    let result = Array.from(byChat.values());

    const q = (query || '').trim().toLowerCase();
    if (q) {
      const needle = q.startsWith('@') ? q.slice(1) : q;
      result = result.filter(
        (item) =>
          item.title?.toLowerCase().includes(needle) ||
          item.username?.toLowerCase().includes(needle) ||
          item.chat_id.includes(needle),
      );
    }

    // Не пропонуємо вже додані до розсилки чати.
    const saved = await this.botChatRepository.find({
      where: { category_id: Number(categoryId) },
    });
    const savedSet = new Set(saved.map((chat) => chat.identifier));
    result = result.filter(
      (item) =>
        !savedSet.has(item.identifier) && !savedSet.has(item.chat_id),
    );

    return result;
  }
}
