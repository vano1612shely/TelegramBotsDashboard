import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateBotDto {
  @IsString()
  name: string;

  @IsString()
  token: string;

  @IsBoolean()
  @IsOptional()
  startWithServer: boolean;

  @IsNumber()
  category_id: number;
}
