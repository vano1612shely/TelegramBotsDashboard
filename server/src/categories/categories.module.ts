import { forwardRef, Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BotCategoryEntity } from '../entities/bots/BotCategory';
import { BotButtonEntity } from '../entities/bots/BotButton';
import { BotsModule } from '../bots/bots.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BotCategoryEntity, BotButtonEntity]),
    forwardRef(() => BotsModule),
  ],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
