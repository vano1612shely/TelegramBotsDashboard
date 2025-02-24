import { BotCategoryType } from "@/types/bot-category.type";

export type ClientType = {
  id: number;
  name: string;
  username: string;
  created_at: Date;
  category: BotCategoryType;
  category_name: string;
  chat_id?: number;
};
