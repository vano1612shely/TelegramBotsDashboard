import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { LoginType } from '../types/LoginType';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from '../entities/users/User';
import { Repository } from 'typeorm';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async login(loginDto: LoginType) {
    const user = await this.validateUser(loginDto);
    if (!user) {
      throw new BadRequestException({
        message: 'Invalid credentials',
      });
    }
    return this.jwtService.sign({
      id: user.id,
      login: user.login,
    });
  }
  async validateUser(loginDto: LoginType) {
    const user = await this.userRepository.findOne({
      where: { login: loginDto.login },
    });
    if (user && (await compare(loginDto.password, user.password))) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }
    return null;
  }

  async getUserByLogin(login: string) {
    return await this.userRepository.findOne({
      where: { login: login },
    });
  }

  async getUserById(id: number) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } =
        await this.userRepository.findOne({
          where: { id: id },
        });
    return userWithoutPassword;
  }

  async createUser(data: LoginType) {
    const user = this.userRepository.create(data);
    user.password = await hash(user.password, 12);
    try {
      await this.userRepository.save(user);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userWihoutPassword } = user;
      return {
        user: userWihoutPassword,
        access_token: this.jwtService.sign({
          id: user.id,
          login: user.login,
        }),
      };
    } catch (e) {
      if (e.code == 23505) {
        throw new ConflictException('User already exists');
      } else {
        throw new InternalServerErrorException();
      }
    }
  }
  async updateUser(id: number, data: LoginType) {
    const password = await hash(data.password, 12);
    const user = this.userRepository.update(
        {
          id: id,
        },
        { ...data, password: password },
    );
    return user;
  }
  addTokenToResponse(res: Response, token) {
    const expiresIn = new Date();
    expiresIn.setDate(expiresIn.getDate() + 30);
    res.cookie('access_token', token, {
      domain: this.configService.get('DOMAIN'),
      expires: expiresIn,
      sameSite: 'none',
    });
  }

  removeTokenFromResponse(res: Response) {
    res.cookie('access_token', '', {
      domain: this.configService.get('DOMAIN'),
      expires: new Date(0),
      sameSite: 'none',
    });
  }
}
