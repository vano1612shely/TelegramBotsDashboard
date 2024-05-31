import { BotCategoryType } from "@/types/bot-category.type";

export type ClientType = {
  id: number;
  name: string;
  username: string;
  create_at: Date;
  category: BotCategoryType;
  category_name: string;
};
