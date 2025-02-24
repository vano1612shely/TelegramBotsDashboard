import { forwardRef, Module } from '@nestjs/common';
import { BotsService } from './bots.service';
import { BotsController } from './bots.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BotEntity } from '../entities/bots/Bot';
import { BotCategoryEntity } from '../entities/bots/BotCategory';
import { BotButtonEntity } from '../entities/bots/BotButton';
import { CategoriesModule } from '../categories/categories.module';
import { BotsHandler } from './bot.handler';
import { ClientsModule } from '../clients/clients.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([BotEntity, BotCategoryEntity, BotButtonEntity]),
    forwardRef(() => CategoriesModule),
    forwardRef(() => ClientsModule),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [BotsController],
  providers: [BotsService, BotsHandler],
  exports: [BotsService],
})
export class BotsModule {}
