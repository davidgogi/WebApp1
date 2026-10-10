import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AppModuleName } from './app-module.enum.js';

// A customer of the platform. `modules` are the modules the superuser has "sold" to it.
@Entity({ name: 'companies' })
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  name!: string;

  @Column({ type: 'text', array: true, default: '{}' })
  modules!: AppModuleName[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
