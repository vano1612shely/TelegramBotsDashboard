import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { ConfigService } from '@nestjs/config';

// Глобальна страховка: жодна «втрачена» асинхронна помилка (напр. тайм-аут
// обробника Telegraf) не повинна вбивати процес і класти всі 100+ ботів.
// Логуємо й продовжуємо роботу — pm2 не потрібно перезапускати весь сервіс.
process.on('unhandledRejection', (reason: any) => {
  console.error('unhandledRejection:', reason?.message || reason);
});
process.on('uncaughtException', (err: any) => {
  console.error('uncaughtException:', err?.message || err);
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = new ConfigService();
  app.enableCors({
    origin: [config.get('CLIENT_URL'), '*'],
    credentials: true,
    exposedHeaders: 'set-cookie',
  });
  app.use(cookieParser());
  await app.listen(3001);
}
bootstrap();
