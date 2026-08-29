import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthStubGuard } from './auth-stub.guard';

describe('AuthStubGuard', () => {
  let guard: AuthStubGuard;

  beforeEach(() => {
    guard = new AuthStubGuard();
  });

  const createMockContext = (authorizationHeader?: string): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {
            authorization: authorizationHeader,
          },
        }),
      }),
    }) as unknown as ExecutionContext;

  it('allows access with a valid Bearer token', () => {
    const context = createMockContext('Bearer valid-token-123');
    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows access when the scheme is lowercase (RFC 7235)', () => {
    const context = createMockContext('bearer valid-token-123');
    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows access when the scheme is mixed case', () => {
    const context = createMockContext('BEARER valid-token-123');
    expect(guard.canActivate(context)).toBe(true);
  });

  it('throws UnauthorizedException when Authorization header is missing', () => {
    const context = createMockContext(undefined);
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when Bearer scheme is missing', () => {
    const context = createMockContext('Basic dXNlcjpwYXNz');
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when token is empty', () => {
    const context = createMockContext('Bearer ');
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});
