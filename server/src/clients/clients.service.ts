import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ClientEntity } from '../entities/clients/Client';
import { Repository } from 'typeorm';
import { CreateClientDto } from './dto/create-user.dto';
import { CategoriesService } from '../categories/categories.service';
import { BotsService } from '../bots/bots.service';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(ClientEntity)
    private readonly clientRepository: Repository<ClientEntity>,
    private readonly categoryService: CategoriesService,
    @Inject(forwardRef(() => BotsService))
    private readonly botsService: BotsService,
  ) {}

  async getAll(
    perPage: number | null,
    page: number | null,
    take_all: string | null,
    select: string[] | null,
    includeRelations: string | null,
  ) {
    const include =
      typeof includeRelations === 'string' ? includeRelations == 'true' : true;
    const offset =
      typeof perPage == 'number' && typeof page == 'number'
        ? (page - 1) * perPage
        : 0;
    let selectArr = [];
    if (select) {
      selectArr = [...select];
    }
    if (take_all === 'true') {
      return await this.clientRepository.find({
        select: selectArr.length > 0 ? selectArr : undefined,
        relations: { category: include ? { buttons: true } : false },
        order: {
          created_at: 'desc',
        },
      });
    }
    return await this.clientRepository.find({
      take: typeof perPage == 'number' ? perPage : 10,
      skip: offset,
      relations: { category: include },
      select: selectArr.length > 0 ? selectArr : undefined,
      order: {
        created_at: 'desc',
      },
    });
  }

  async getById(id: number) {
    return await this.clientRepository.findOne({
      where: { id: id },
      relations: { category: true },
    });
  }

  async create(data: CreateClientDto) {
    const checkUser = await this.clientRepository.findOne({
      where: {
        chat_id: String(data.chat_id),
        category_id: data.category_id,
        bot_id: data.bot_id,
      },
      relations: { category: true },
    });
    const bot = await this.botsService.getBot(data.bot_id);
    const category = await this.categoryService.getCategory(data.category_id);
    if (checkUser) {
      return await this.clientRepository.update(
        {
          chat_id: String(data.chat_id),
          category_id: data.category_id,
          bot_id: data.bot_id,
        },
        {
          username: data.username,
          name: data.name,
        },
      );
    }
    return await this.clientRepository.save({
      name: data.name,
      username: data.username,
      category: category,
      category_name: category.name,
      chat_id: String(data.chat_id),
      bot: bot,
    });
  }

  async delete(id: number) {
    return await this.clientRepository.delete(id);
  }

  async findByCategory(categoryId: number): Promise<ClientEntity[]> {
    return this.clientRepository.find({ where: { category_id: categoryId } });
  }
}
