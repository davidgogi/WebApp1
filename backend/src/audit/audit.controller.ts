import { Controller, Get } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user.js';
import { CurrentUser, Roles } from '../auth/decorators.js';
import { UserRole } from '../auth/user-role.enum.js';
import { AuditLog } from './audit-log.entity.js';
import { AuditService } from './audit.service.js';

@Controller('audit')
@Roles(UserRole.SUPERUSER, UserRole.SYSTEM_ADMIN)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  find(@CurrentUser() user: AuthUser): Promise<AuditLog[]> {
    return this.auditService.find(user);
  }
}
