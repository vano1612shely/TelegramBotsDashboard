import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @UsePipes(new ValidationPipe())
  @HttpCode(200)
  @Post('/create')
  async createCategory(@Body() data: CreateCategoryDto) {
    return await this.categoriesService.createCategory(data);
  }

  @HttpCode(200)
  @Get()
  async getCategories(
    @Query('per_page') perPage?: number | null,
    @Query('page') page?: number | null,
    @Query('take_all') take_all?: string | null,
    @Query('select') select?: string[] | null,
    @Query('include_relations') includeRelations?: string | null,
  ) {
    return await this.categoriesService.getAll(
      perPage ? Number(perPage) : null,
      page ? Number(page) : null,
      take_all,
      select,
      includeRelations,
    );
  }

  @HttpCode(200)
  @Get('/:id')
  async getCategory(@Param('id') id: number) {
    return await this.categoriesService.getCategory(id);
  }

  @HttpCode(200)
  @Delete('/:id')
  async deleteCategory(@Param('id') id: number) {
    return await this.categoriesService.deleteCategory(id);
  }

  @HttpCode(200)
  @Patch('/:id')
  async updateCategory(
    @Param('id') id: number,
    @Body() data: UpdateCategoryDto, // Припустимо, у вас є DTO для оновлення категорії під назвою UpdateCategoryDto
  ) {
    return await this.categoriesService.updateCategory(id, data);
  }
}
