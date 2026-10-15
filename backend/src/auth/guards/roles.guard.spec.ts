import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { AuthUser } from '../auth.types';
import { RolesGuard } from './roles.guard';

function contextFor(user: AuthUser | undefined): ExecutionContext {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  const reflector = new Reflector();
  const guard = new RolesGuard(reflector);

  const requireRoles = (roles: Role[] | undefined) =>
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(roles);

  it('allows any authenticated user when the route has no @Roles()', () => {
    requireRoles(undefined);
    expect(guard.canActivate(contextFor({ id: 1, role: Role.EMPLOYEE }))).toBe(
      true,
    );
  });

  it('allows an admin on an admin-only route', () => {
    requireRoles([Role.ADMIN]);
    expect(guard.canActivate(contextFor({ id: 1, role: Role.ADMIN }))).toBe(
      true,
    );
  });

  it('blocks an employee from an admin-only route', () => {
    requireRoles([Role.ADMIN]);
    expect(() =>
      guard.canActivate(contextFor({ id: 2, role: Role.EMPLOYEE })),
    ).toThrow(ForbiddenException);
  });
});
