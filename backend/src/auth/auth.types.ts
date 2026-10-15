import { Role } from '@prisma/client';
import { Request } from 'express';

export const AUTH_COOKIE = 'access_token';

/** What we sign into the JWT. Kept minimal: id + role is all the guards need. */
export interface JwtPayload {
  sub: number;
  role: Role;
}

/** The authenticated user attached to the request by JwtAuthGuard. */
export interface AuthUser {
  id: number;
  role: Role;
}

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}
