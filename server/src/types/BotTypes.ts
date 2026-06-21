import { BotEntity } from '../entities/bots/Bot';
import { Telegraf } from 'telegraf';

export type BotType = BotEntity & {
  botInstance: Telegraf;
  status: 'started' | 'stopped';
  // Telegram id of the bot itself (from getMe), cached lazily.
  telegramId?: number;
};

export type CreateBot = {
  name: string;
  token: string;
  startWithServer?: boolean | null | undefined;
  category_id: number;
};

export type CreateCategory = {
  name: string;
  text: string;
  image: File;
  buttons: CreateBotButton[];
};

export type CreateBotButton = {
  title: string;
  link: string;
};
