import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {WsAdapter} from '@nestjs/platform-ws';
import {ValidationPipe} from '@nestjs/common';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useWebSocketAdapter(new WsAdapter(app));

  app.use(helmet());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist :true ,
      forbidNonWhitelisted:true,
      transform :true,
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
