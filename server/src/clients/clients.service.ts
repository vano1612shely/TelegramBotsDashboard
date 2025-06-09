import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ClientEntity } from '../entities/clients/Client';
import {DataSource, Repository} from 'typeorm';
import { CreateClientDto } from './dto/create-user.dto';
import { CategoriesService } from '../categories/categories.service';
import { BotsService } from '../bots/bots.service';

function toSelectObject<T>(
    fields: string[],
): Partial<Record<keyof T, boolean>> {
  return fields.reduce(
      (acc, field) => {
        acc[field as keyof T] = true;
        return acc;
      },
      {} as Partial<Record<keyof T, boolean>>,
  );
}

@Injectable()
export class ClientsService {
  constructor(
      @InjectRepository(ClientEntity)
      private readonly clientRepository: Repository<ClientEntity>,
      private readonly categoryService: CategoriesService,
      @Inject(forwardRef(() => BotsService))
      private readonly botsService: BotsService,
      private readonly dataSource: DataSource,
  ) {}

  async getAll(
      perPage: number | null,
      page: number | null,
      take_all: string | null,
      select: string[] | null,
      includeRelations: string | null,
  ) {
    const include =
        typeof includeRelations === 'string' ? includeRelations === 'true' : true;
    const offset =
        typeof perPage === 'number' && typeof page === 'number'
            ? (page - 1) * perPage
            : 0;

    let selectObj: Partial<Record<keyof ClientEntity, boolean>> | undefined;
    if (select && select.length > 0) {
      selectObj = toSelectObject<ClientEntity>(select);
    }

    const relations = include
        ? {
          categories: { buttons: true },
          bots: true,
        }
        : {};

    if (take_all === 'true') {
      return await this.clientRepository.find({
        select: selectObj,
        relations,
        order: { created_at: 'desc' },
      });
    }

    return await this.clientRepository.find({
      take: typeof perPage === 'number' ? perPage : 10,
      skip: offset,
      select: selectObj,
      relations,
      order: { created_at: 'desc' },
    });
  }

  async getById(id: number) {
    return await this.clientRepository.findOne({
      where: { id },
      relations: { categories: true, bots: true },
    });
  }

  async create(data: CreateClientDto) {
    const chat_id = String(data.chat_id);

    const bot = await this.botsService.getBot(data.bot_id);
    const category = await this.categoryService.getCategory(data.category_id);

    const client = await this.clientRepository.findOne({
      where: { chat_id },
      relations: ['bots', 'categories'],
    });

    if (client) {
      const botAlreadyLinked = client.bots?.some((b) => b.id === bot.id);
      const categoryAlreadyLinked = client.categories?.some(
          (c) => c.id === category.id,
      );

      if (!botAlreadyLinked) {
        client.bots.push(bot);
      }

      if (!categoryAlreadyLinked) {
        client.categories.push(category);
      }

      client.name = data.name;
      client.username = data.username;

      return await this.clientRepository.save(client);
    }

    const newClient = this.clientRepository.create({
      name: data.name,
      username: data.username,
      chat_id,
      bots: [bot],
      categories: [category],
    });

    return await this.clientRepository.save(newClient);
  }

  async delete(id: number) {
    return await this.clientRepository.delete(id);
  }

  async findByCategory(categoryId: number): Promise<ClientEntity[]> {
    return this.clientRepository
        .createQueryBuilder('client')
        .leftJoin('client.categories', 'category')
        .where('category.id = :categoryId', { categoryId })
        .getMany();
  }

  async linkBotToClient(clientId: number, botId: number): Promise<boolean> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Для PostgreSQL використовуємо правильний синтаксис з $1, $2
      const existingRelation = await queryRunner.query(
          `SELECT 1 FROM client_bot WHERE "client_id" = $1 AND "bot_id" = $2 FOR UPDATE`,
          [clientId, botId]
      );

      if (existingRelation.length > 0) {
        await queryRunner.commitTransaction();
        console.log(`Bot ${botId} already linked to client ${clientId}`);
        return true;
      }

      // Для PostgreSQL використовуємо ON CONFLICT замість INSERT IGNORE
      await queryRunner.query(
          `INSERT INTO client_bot ("client_id", "bot_id") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [clientId, botId]
      );

      await queryRunner.commitTransaction();
      console.log(`Successfully linked bot ${botId} to client ${clientId}`);
      return true;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error(`Error linking bot ${botId} to client ${clientId}:`, error);
      return false;
    } finally {
      await queryRunner.release();
    }
  }

  async hasClientBotRelation(clientId: number, botId: number): Promise<boolean> {
    try {
      const client = await this.clientRepository.findOne({
        where: { id: clientId },
        relations: ['bots'],
      });

      if (!client || !client.bots) {
        return false;
      }

      return client.bots.some((bot) => bot.id === botId);
    } catch (error) {
      console.error(`Error checking client-bot relation:`, error);
      return false;
    }
  }
}