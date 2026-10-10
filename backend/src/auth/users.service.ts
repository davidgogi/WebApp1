import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModuleName } from '../companies/app-module.enum.js';
import { generatePassword, hashPassword } from './password.js';
import { UserRole } from './user-role.enum.js';
import { User } from './user.entity.js';

export interface Credentials {
  displayName: string;
  username: string;
  password: string; // plain text, shown once and never stored
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  findByEmployeeId(employeeId: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { employeeId } });
  }

  async create(params: {
    role: UserRole;
    module: AppModuleName | null;
    companyId: string;
    companyName: string;
    displayName: string;
    employeeId?: string;
  }): Promise<Credentials> {
    const username = await this.freeUsername(params);
    const password = generatePassword();
    await this.usersRepository.save(
      this.usersRepository.create({
        username,
        passwordHash: hashPassword(password),
        displayName: params.displayName,
        role: params.role,
        module: params.module,
        companyId: params.companyId,
        employeeId: params.employeeId ?? null,
      }),
    );
    return { displayName: params.displayName, username, password };
  }

  async resetPassword(user: User): Promise<Credentials> {
    const password = generatePassword();
    user.passwordHash = hashPassword(password);
    await this.usersRepository.save(user);
    return { displayName: user.displayName, username: user.username, password };
  }

  // e.g. wms-manager.acme.4821: says what the login is for, and which company.
  private async freeUsername(params: { role: UserRole; module: AppModuleName | null; companyName: string }) {
    const company = params.companyName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'co';
    const kind = {
      [UserRole.SYSTEM_ADMIN]: 'admin',
      [UserRole.MODULE_ADMIN]: `${params.module}-admin`,
      [UserRole.MANAGER]: `${params.module}-manager`,
      [UserRole.CASHIER]: 'cashier',
      [UserRole.SUPERUSER]: 'superuser',
    }[params.role];
    const base = `${kind}.${company}`;

    if (params.role === UserRole.SYSTEM_ADMIN && !(await this.usersRepository.existsBy({ username: base }))) {
      return base;
    }
    for (;;) {
      const username = `${base}.${String(Math.floor(1000 + Math.random() * 9000))}`;
      if (!(await this.usersRepository.existsBy({ username }))) {
        return username;
      }
    }
  }
}
