import { SetMetadata } from '@nestjs/common';

export type Role = 'ADMIN' | 'STAFF';

export const ROLES_KEY = 'roles';

/**
 * Restricts a route to the given roles. Used together with RolesGuard.
 *   @Roles('ADMIN')
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
