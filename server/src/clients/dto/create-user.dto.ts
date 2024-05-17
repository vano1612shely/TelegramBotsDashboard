import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateClientDto {
  @IsString()
  username: string;

  @IsString()
  name: string;

  @IsNumber()
  category_id: number;
}
