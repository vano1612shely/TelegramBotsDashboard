export type BotCategoryType = {
  id: number;
  name: string;
  text: string;
  image_link: string;
  buttons: BotButtonType[];
};

export type BotButtonType = {
  id: number;
  title: string;
  link: string;
};

export type BotCategoryKeys = keyof BotCategoryType;
