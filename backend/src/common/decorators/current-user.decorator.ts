import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'STAFF';
  companyId: string;
}

/**
 * Injects the authenticated user (populated by JwtStrategy.validate) into a
 * controller handler. Pass a property name to extract just that field:
 *   @CurrentUser() user: AuthUser
 *   @CurrentUser('companyId') companyId: string
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthUser;
    return data ? user?.[data] : user;
  },
);
