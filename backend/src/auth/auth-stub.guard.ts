import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class AuthStubGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader || typeof authHeader !== 'string') {
      throw new UnauthorizedException('Missing Authorization header');
    }

    // RFC 7235: the auth scheme is case-insensitive, so `bearer <token>`
    // is as valid as `Bearer <token>`. Some HTTP clients normalise it to
    // lowercase, and rejecting those would be our bug, not theirs.
    const parts = authHeader.trim().split(/\s+/);
    if (
      parts.length !== 2 ||
      parts[0].toLowerCase() !== 'bearer' ||
      !parts[1]
    ) {
      throw new UnauthorizedException(
        'Invalid Authorization header format. Expected "Bearer <token>"',
      );
    }

    return true;
  }
}
