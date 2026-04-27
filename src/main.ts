import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: (process.env.FRONTEND_ORIGIN ?? 'https://echo-production-009d.up.railway.app')
      .split(',')
      .map((origin) => origin.trim()),
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
