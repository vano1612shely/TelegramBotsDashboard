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
      const res = await (
        await fetch(`https://api.telegram.org/bot${bot.token}/getMe`)
      ).json();
      if (res.ok) {
        this.botsHandler.addAllHandlers(botItem);
        botItem.botInstance.launch();
        botItem.status = 'started';
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

  async sendMessage(
    categoryId: number,
    message: string,
    files?: Express.Multer.File[],
  ) {
    try {
      const clients = await this.clientsService.findByCategory(
        Number(categoryId),
      );
      if (!clients.length) {
        console.log(`No clients found for category ${categoryId}`);
        return;
      }
      const bot = this.getBotByCategory(categoryId);
      if (!bot) {
        console.log(`No bot found for category ${categoryId}`);
        return;
      }

      await Promise.allSettled(
        clients.map(async (client) => {
          if (client.chat_id)
            try {
              if (files && files.length > 0) {
                // Створюємо масив фото для `sendMediaGroup`
                const mediaGroup: InputMediaPhoto[] = files.map(
                  (file, index) => ({
                    type: 'photo',
                    media: { source: Buffer.from(file.buffer) },
                    ...(index === files.length - 1
                      ? { caption: message, parse_mode: 'HTML' }
                      : {}),
                  }),
                );

                await bot.botInstance.telegram.sendMediaGroup(
                  client.chat_id,
                  mediaGroup,
                );
              } else {
                await bot.botInstance.telegram.sendMessage(
                  client.chat_id,
                  message,
                  {
                    parse_mode: 'HTML',
                  },
                );
              }
            } catch (error) {
              console.error(`Error sending message to ${client.username}`);
            }
        }),
      );
    } catch (error) {
      console.error('sendMessage error:', error);
    }
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
