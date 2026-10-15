import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

/** Shared by main.ts and the e2e tests so both run the exact same app config. */
export function configureApp(app: INestApplication): void {
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
}
