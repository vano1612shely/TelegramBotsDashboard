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

export type SendTarget = "clients" | "chats" | "all";

export type BotChat = {
  id: number;
  identifier: string;
  title: string | null;
  type: "channel" | "group";
  category_id: number;
  adminBots?: string[];
};

export type ChatSuggestion = {
  identifier: string;
  chat_id: string;
  username: string | null;
  title: string | null;
  type: string;
  bestStatus: "creator" | "administrator" | "member";
  bots: string[];
};
