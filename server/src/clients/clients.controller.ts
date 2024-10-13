import {Controller, Delete, Get, HttpCode, Param, Query} from '@nestjs/common';
import { ClientsService } from './clients.service';

@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @HttpCode(200)
  @Get()
  async getClients(
    @Query('per_page') perPage?: number | null,
    @Query('page') page?: number | null,
    @Query('take_all') take_all?: string | null,
    @Query('select') select?: string[] | null,
    @Query('include_relations') includeRelations?: string | null,
  ) {
    return await this.clientsService.getAll(
      perPage ? Number(perPage) : null,
      page ? Number(page) : null,
      take_all,
      select,
      includeRelations,
    );
  }

  @Delete("/:id")
  async deleteClient(@Param('id') id: number) {
    return await this.clientsService.delete(id);
  }
  @HttpCode(200)
  @Get('/:id')
  async getCategory(@Param('id') id: number) {
    return await this.clientsService.getById(id);
  }
}
