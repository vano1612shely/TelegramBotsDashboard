import { IsArray, IsOptional, IsString } from 'class-validator';
import { CreateBotButtonDto } from './create-category.dto';

export class UpdateCategoryDto {
  @IsOptional() // Це поле необов'язкове, оскільки користувач може оновити лише певні дані категорії
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsString()
  image_link?: string;

  @IsOptional()
  @IsArray()
  buttons?: CreateBotButtonDto[]; // Можливість оновлення кнопок
}
