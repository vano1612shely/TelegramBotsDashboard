import { IsArray, IsString } from 'class-validator';

export class CreateBotButtonDto {
  @IsString()
  title: string;

  @IsString()
  link: string;
}

export class CreateCategoryDto {
  @IsString()
  name: string;

  @IsString()
  text: string;

  @IsString()
  image_link: string;

  @IsArray()
  buttons: CreateBotButtonDto[];
}
