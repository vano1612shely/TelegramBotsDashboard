import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus, Param, ParseIntPipe, Patch,
  Post, Req,
  Res,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginType } from '../types/LoginType';
import { Public } from '../decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('/login')
  @HttpCode(200)
  @UsePipes(new ValidationPipe({ transform: true }))
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() data: LoginType,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = await this.authService.login(data);
    this.authService.addTokenToResponse(res, token);
    return { access_token: token };
  }
  @Public()
  @Post('/create')
  @UsePipes(new ValidationPipe({ transform: true }))
  async createUser(@Body() data: LoginType) {
    return await this.authService.createUser(data);
  }
  @Get('/getMe')
  async getMe(@Req() req) {
    return await this.authService.getUserById(req.user_id);
  }
  @Patch('/:id')
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateUser(
      @Param('id', ParseIntPipe) id: number,
      @Body() data: LoginType,
  ) {
    return await this.authService.updateUser(id, data);
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    this.authService.removeTokenFromResponse(res);
    return true;
  }
}
