import { BadRequestException } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user.js';
import { UserRole } from '../auth/user-role.enum.js';

export const STORE_TIME_ZONE = 'Asia/Tbilisi';
const MAX_PERIOD_DAYS = 366;

export const round2 = (value: number) => Math.round(value * 100) / 100;
export const round3 = (value: number) => Math.round(value * 1000) / 1000;

export function isStoreAdmin(actor: AuthUser): boolean {
  return actor.role === UserRole.SYSTEM_ADMIN || actor.role === UserRole.MODULE_ADMIN;
}

export function todayInStore(): string {
  return dayInStore(new Date());
}

export function dayInStore(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: STORE_TIME_ZONE }).format(date);
}

export function period(from: string | undefined, to: string | undefined, defaultDays = 30): { from: string; to: string } {
  const end = to ?? todayInStore();
  const start = from ?? shiftDays(end, -(defaultDays - 1));
  if (start > end) {
    throw new BadRequestException('The period starts after it ends');
  }
  if (shiftDays(start, MAX_PERIOD_DAYS) <= end) {
    throw new BadRequestException(`The period can be at most ${MAX_PERIOD_DAYS} days`);
  }
  return { from: start, to: end };
}

function shiftDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function localDaySql(column: string): string {
  return `(${column} AT TIME ZONE '${STORE_TIME_ZONE}')::date`;
}
