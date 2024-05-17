import { BotCategoryType } from "@/types/bot-category.type";

export type BotType = {
  id: number;
  name: string;
  token: string;
  category_id: number;
  category: BotCategoryType;
  startWithServer: boolean;
};

export type BotKeys = keyof BotType;
