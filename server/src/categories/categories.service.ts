import { forwardRef, Inject, Injectable } from '@nestjs/common';
import {
  CreateBotButtonDto,
  CreateCategoryDto,
} from './dto/create-category.dto';
import { BotButtonEntity } from '../entities/bots/BotButton';
import { InjectRepository } from '@nestjs/typeorm';
import { BotCategoryEntity } from '../entities/bots/BotCategory';
import { Repository } from 'typeorm';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { BotsService } from '../bots/bots.service';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(BotCategoryEntity)
    private readonly botCategoryRepository: Repository<BotCategoryEntity>,
    @InjectRepository(BotButtonEntity)
    private readonly botButtonRepository: Repository<BotButtonEntity>,
    @Inject(forwardRef(() => BotsService))
    private readonly botsService: BotsService,
  ) {}
  async createCategory(data: CreateCategoryDto) {
    const category = await this.botCategoryRepository.save({
      name: data.name,
      text: data.text,
      image_link: data.image_link,
    });
    const buttons = [];
    data.buttons.map((button) => {
      const btn = this.botButtonRepository.create({
        title: button.title,
        link: button.link,
        category_id: category.id,
      });
      buttons.push(btn);
    });
    await this.saveButton(buttons);
    return category;
  }

  async getCategory(id: number) {
    return await this.botCategoryRepository.findOne({
      where: { id: id },
      relations: { buttons: true },
    });
  }

  async getAll(
    perPage: number | null,
    page: number | null,
    take_all: string | null,
    select: string[] | null,
    includeRelations: string | null,
  ) {
    let include =
      typeof includeRelations === 'string' ? includeRelations == 'true' : true;
    let offset =
      typeof perPage == 'number' && typeof page == 'number'
        ? (page - 1) * perPage
        : 0;
    let selectArr = [];
    if (select) {
      selectArr = [...select];
    }
    if (take_all === 'true') {
      return await this.botCategoryRepository.find({
        select: selectArr.length > 0 ? selectArr : undefined,
        relations: { buttons: include },
      });
    }
    return await this.botCategoryRepository.find({
      take: typeof perPage == 'number' ? perPage : 10,
      skip: offset,
      relations: { buttons: include },
      select: selectArr.length > 0 ? selectArr : undefined,
    });
  }

  async deleteCategory(id: number) {
    const category = await this.botCategoryRepository.findOne({
      where: { id: id },
      relations: {
        bots: true,
      },
    });
    for (const bot of category.bots) {
      await this.botsService.deleteBot(bot.id);
    }
    return await this.botCategoryRepository.delete({ id: id });
  }

  private async saveButton(data: BotButtonEntity[], index: number = 0) {
    if (index < data.length) {
      await this.botButtonRepository.save(data[index]);
      await this.saveButton(data, index + 1);
    }
  }

  async updateCategory(id: number, data: UpdateCategoryDto) {
    const category = await this.botCategoryRepository.findOne({
      where: { id },
    });
    if (!category) {
      throw new Error('Category not found');
    }

    // Оновлюємо дані категорії з вхідними даними
    category.name = data.name ?? category.name;
    category.text = data.text ?? category.text;
    category.image_link = data.image_link ?? category.image_link;

    // Оновлюємо кнопки категорії
    await this.updateButtons(category, data.buttons);

    // Зберігаємо оновлену категорію
    return await this.botCategoryRepository.save(category);
  }

  private async updateButtons(
    category: BotCategoryEntity,
    buttonsData: CreateBotButtonDto[],
  ) {
    // Видаляємо старі кнопки категорії
    await this.botButtonRepository.delete({ category_id: category.id });

    // Створюємо та зберігаємо нові кнопки
    const buttons = buttonsData.map((button) => {
      return this.botButtonRepository.create({
        title: button.title,
        link: button.link,
        category_id: category.id,
      });
    });

    await this.saveButton(buttons);
  }
}
