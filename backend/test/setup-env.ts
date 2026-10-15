// e2e tests run against a separate database so they never touch dev data.
// Set before the app (and PrismaClient) is created; ConfigModule does not
// override variables that are already set.
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://postgres:postgres@127.0.0.1:5432/it_equipment_test?schema=public';

process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.JWT_SECRET = 'e2e-test-secret';
