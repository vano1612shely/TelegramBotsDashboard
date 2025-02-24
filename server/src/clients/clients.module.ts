import { forwardRef, Module } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientEntity } from '../entities/clients/Client';
import { CategoriesModule } from '../categories/categories.module';
import { BotsModule } from '../bots/bots.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ClientEntity]),
    CategoriesModule,
    forwardRef(() => BotsModule),
  ],
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}
