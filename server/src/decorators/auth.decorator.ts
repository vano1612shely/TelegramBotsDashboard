import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../guards/jwt-auth-guard';

export const Auth = () => UseGuards(AuthGuard);
