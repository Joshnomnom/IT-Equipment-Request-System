import { execSync } from 'child_process';
import { TEST_DATABASE_URL } from './setup-env';

/** Create the test database if needed and apply all migrations, once per run. */
export default function globalSetup(): void {
  execSync('npx prisma migrate deploy', {
    cwd: `${__dirname}/..`,
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'inherit',
  });
}
