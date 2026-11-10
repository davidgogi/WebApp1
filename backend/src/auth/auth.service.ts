import {
  Injectable,
  Logger,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service.js';
import { AuthUser, SessionUser, toSessionUser } from './auth-user.js';
import { hashPassword, verifyPassword } from './password.js';
import { signToken, verifyToken } from './token.js';
import { CompanyStatus } from '../companies/company-status.enum.js';
import { acrossCompanies, scopeTo } from '../database/tenant-scope.js';
import { UserRole } from './user-role.enum.js';
import { User } from './user.entity.js';
import { PlatformAdmin } from './platform-admin.entity.js';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(PlatformAdmin)
    private readonly adminsRepository: Repository<PlatformAdmin>,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): Promise<void> {
    return acrossCompanies(() => this.ensureSuperuser());
  }

  private async ensureSuperuser(): Promise<void> {
    const username =
      this.config.get<string>('SUPERUSER_USERNAME') ?? 'superuser';
    const password = this.config.get<string>('SUPERUSER_PASSWORD');
    if ((await this.adminsRepository.count()) === 0) {
      await this.adminsRepository.save(
        this.adminsRepository.create({
          username,
          passwordHash: hashPassword(password ?? 'superuser'),
          displayName: 'Superuser',
        }),
      );
      this.logger.log(
        password
          ? `Created the superuser "${username}" with the password from SUPERUSER_PASSWORD`
          : `Created the superuser "${username}" with the default password "superuser" (set SUPERUSER_PASSWORD in .env to choose another)`,
      );
      return;
    }
    if (!password) {
      return;
    }
    const admin = await this.adminsRepository.findOneBy({ username });
    if (admin && !verifyPassword(password, admin.passwordHash)) {
      admin.passwordHash = hashPassword(password);
      await this.adminsRepository.save(admin);
      this.logger.log(
        `Changed the superuser "${username}"'s password to the one in SUPERUSER_PASSWORD`,
      );
    }
  }

  async login(
    username: string,
    password: string,
    superuser: boolean,
  ): Promise<{ token: string; user: SessionUser }> {
    if (superuser) {
      return this.loginPlatformAdmin(username, password);
    }
    const user = await acrossCompanies(() =>
      this.usersRepository.findOne({
        where: { username: username.trim() },
        relations: { company: true, employee: true },
      }),
    );
    const passwordOk = !!user && verifyPassword(password, user.passwordHash);
    if (!user || !passwordOk) {
      throw new UnauthorizedException('Wrong username or password');
    }
    if (user.company && user.company.status !== CompanyStatus.ACTIVE) {
      throw new UnauthorizedException(
        `${user.company.name}'s access is ${user.company.status === CompanyStatus.SUSPENDED ? 'suspended' : 'cancelled'}. Please contact the app provider.`,
      );
    }
    const authUser = this.toAuthUser(user);
    if (!authUser) {
      throw new UnauthorizedException('Wrong username or password');
    }

    scopeTo(authUser);
    await this.audit.record(
      authUser,
      'auth.login',
      `${authUser.displayName} logged in`,
    );
    return { token: signToken(user.id, 'user'), user: toSessionUser(authUser) };
  }

  private async loginPlatformAdmin(
    username: string,
    password: string,
  ): Promise<{ token: string; user: SessionUser }> {
    const admin = await this.adminsRepository.findOneBy({
      username: username.trim(),
    });
    if (!admin || !verifyPassword(password, admin.passwordHash)) {
      throw new UnauthorizedException('Wrong username or password');
    }
    const authUser = this.toPlatformUser(admin);
    scopeTo(authUser);
    await this.audit.record(
      authUser,
      'auth.login',
      `${authUser.displayName} logged in`,
    );
    return {
      token: signToken(admin.id, 'platform'),
      user: toSessionUser(authUser),
    };
  }

  async setLanguage(actor: AuthUser, language: string): Promise<SessionUser> {
    if (actor.role === UserRole.SUPERUSER) {
      await this.adminsRepository.update({ id: actor.userId }, { language });
    } else {
      await this.usersRepository.update({ id: actor.userId }, { language });
    }
    return toSessionUser({ ...actor, language });
  }

  async authenticate(token: string): Promise<AuthUser | null> {
    const subject = verifyToken(token);
    if (!subject) {
      return null;
    }
    if (subject.kind === 'platform') {
      const admin = await this.adminsRepository.findOneBy({ id: subject.id });
      return admin ? this.toPlatformUser(admin) : null;
    }
    const user = await acrossCompanies(() =>
      this.usersRepository.findOne({
        where: { id: subject.id },
        relations: { company: true, employee: true },
      }),
    );
    return user ? this.toAuthUser(user) : null;
  }

  private toPlatformUser(admin: PlatformAdmin): AuthUser {
    return {
      userId: admin.id,
      username: admin.username,
      displayName: admin.displayName,
      role: UserRole.SUPERUSER,
      module: null,
      companyId: null,
      companyName: null,
      companyModules: [],
      employeeId: null,
      language: admin.language,
    };
  }

  private toAuthUser(user: User): AuthUser | null {
    const today = new Date().toISOString().slice(0, 10);
    if (user.company && user.company.status !== CompanyStatus.ACTIVE) {
      return null;
    }
    if (user.employee?.endDate && user.employee.endDate <= today) {
      return null;
    }
    return {
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      module: user.module,
      companyId: user.companyId,
      companyName: user.company?.name ?? null,
      companyModules: user.company?.modules ?? [],
      employeeId: user.employeeId,
      language: user.language,
    };
  }
}
