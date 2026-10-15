import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const findUnique = jest.fn();
  const prisma = { user: { findUnique } } as unknown as PrismaService;
  const jwtService = new JwtService({ secret: 'test-secret' });
  const service = new AuthService(prisma, jwtService);

  let user: User;

  beforeAll(async () => {
    user = {
      id: 1,
      name: 'Test',
      email: 'test@example.com',
      passwordHash: await bcrypt.hash('correct-password', 4),
      role: Role.EMPLOYEE,
      createdAt: new Date(),
    };
  });

  beforeEach(() => findUnique.mockReset());

  it('returns a signed token and the user without passwordHash', async () => {
    findUnique.mockResolvedValue(user);

    const result = await service.login({
      email: user.email,
      password: 'correct-password',
    });

    expect(result.user).not.toHaveProperty('passwordHash');
    expect(result.user.email).toBe(user.email);
    const payload = await jwtService.verifyAsync<{ sub: number; role: Role }>(
      result.accessToken,
    );
    expect(payload).toMatchObject({ sub: 1, role: Role.EMPLOYEE });
  });

  it('rejects a wrong password', async () => {
    findUnique.mockResolvedValue(user);

    await expect(
      service.login({ email: user.email, password: 'wrong' }),
    ).rejects.toThrow(new UnauthorizedException('Invalid email or password'));
  });

  it('rejects an unknown email with the same message', async () => {
    findUnique.mockResolvedValue(null);

    await expect(
      service.login({ email: 'nobody@example.com', password: 'whatever' }),
    ).rejects.toThrow(new UnauthorizedException('Invalid email or password'));
  });
});
