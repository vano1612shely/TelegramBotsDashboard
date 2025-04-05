import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { BotsService } from './bots.service';
import { CreateBotDto } from './dto/create-bot.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';

@Controller('bots')
export class BotsController {
  constructor(private readonly botsService: BotsService) {}

  @UsePipes(new ValidationPipe())
  @HttpCode(200)
  @Post('/create')
  async createBot(@Body() data: CreateBotDto) {
    return await this.botsService.create(data);
  }

  @HttpCode(200)
  @Get()
  async getBots(
    @Query('per_page') perPage?: number | null,
    @Query('page') page?: number | null,
    @Query('take_all') take_all?: string | null,
    @Query('select') select?: string[] | null,
    @Query('include_relations') includeRelations?: string | null,
  ) {
    return await this.botsService.getAll(
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
    return await this.botsService.getBot(id);
  }

  @HttpCode(200)
  @Delete('/:id')
  async deleteBot(@Param('id') id: number) {
    return await this.botsService.deleteBot(Number(id));
  }

  @HttpCode(200)
  @Get('/stop/:id')
  async stop(@Param('id') id: number) {
    return await this.botsService.stop(Number(id));
  }

  @HttpCode(200)
  @Get('/status/:id')
  async getStatus(@Param('id') id: number) {
    return await this.botsService.getStatus(Number(id));
  }

  @HttpCode(200)
  @Get('/start/:id')
  async start(@Param('id') id: number) {
    return await this.botsService.start(Number(id));
  }

  @HttpCode(200)
  @Get('/reboot/:id')
  async reboot(@Param('id') id: number) {
    return await this.botsService.reboot(Number(id));
  }

  @Post('send-message')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'files', maxCount: 10 }]))
  async sendMessage(
    @Body() body: { categoryId: number; message: string; buttons: string },
    @UploadedFiles() files: { files?: Express.Multer.File[] },
  ) {
    return this.botsService.sendMessage(
      body.categoryId,
      body.message,
      files.files,
      body.buttons,
    );
  }
}
