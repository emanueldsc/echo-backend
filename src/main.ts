import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getFrontendOrigins } from './shared/utils/frontend-origin';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: getFrontendOrigins(),
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
