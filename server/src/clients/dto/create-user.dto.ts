import { IsNumber, IsString } from 'class-validator';

export class CreateClientDto {
  @IsString()
  username: string;

  @IsString()
  name: string;

  @IsNumber()
  category_id: number;

  @IsNumber()
  chat_id: number;

  @IsNumber()
  bot_id: number;
}
