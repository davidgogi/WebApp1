import {
  AfterInsert,
  AfterLoad,
  AfterUpdate,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EmployeeRole } from './employee-role.enum.js';
import { EmployeeStatus } from './employee-status.enum.js';

@Entity({ name: 'employees' })
export class Employee {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'first_name' })
  firstName!: string;

  @Column({ name: 'last_name' })
  lastName!: string;

  // Georgian personal number (პირადი ნომერი): 11 digits. The new columns are nullable only
  // because employees created before they existed have no value; the API requires them.
  @Column({
    name: 'personal_id',
    type: 'varchar',
    length: 11,
    unique: true,
    nullable: true,
  })
  personalId!: string | null;

  @Column({ type: 'varchar', nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', nullable: true })
  branch!: string | null;

  // `date` columns are returned as 'YYYY-MM-DD' strings (no time zone involved).
  @Column({ name: 'birth_date', type: 'date', nullable: true })
  birthDate!: string | null;

  @Column({ name: 'hire_date', type: 'date', nullable: true })
  hireDate!: string | null;

  @Column({ type: 'varchar', nullable: true })
  position!: string | null;

  // Last working day. Empty while the employee still works here.
  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate!: string | null;

  @Column({ type: 'enum', enum: EmployeeRole })
  role!: EmployeeRole;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Not stored: always calculated from the end date, so it can never contradict it and it
  // switches to FORMER by itself once the end date has passed.
  status!: EmployeeStatus;

  @AfterLoad()
  @AfterInsert()
  @AfterUpdate()
  computeStatus(): void {
    const today = new Date().toISOString().slice(0, 10);
    this.status =
      this.endDate && this.endDate <= today
        ? EmployeeStatus.FORMER
        : EmployeeStatus.ACTIVE;
  }
}
