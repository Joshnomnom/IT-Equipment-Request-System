import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  // Auth token travels in an httpOnly cookie, so we need to parse cookies.
  // No CORS: the Next.js frontend proxies /api/* to this server, so the
  // browser only ever talks to a single origin.
  app.use(cookieParser());

  // Validate every incoming DTO: strip unknown fields, reject them, and
  // convert query/path strings into the declared types (e.g. page -> number).
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 4000);
}
void bootstrap();
