import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
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

  @Post('/create')
  @UsePipes(new ValidationPipe({ transform: true }))
  async createUser(@Body() data: LoginType) {
    return await this.authService.createUser(data);
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    this.authService.removeTokenFromResponse(res);
    return true;
  }
}
