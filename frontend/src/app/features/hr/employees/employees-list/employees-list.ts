import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AbstractControl,
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { LucideAngularModule, Plus, Search } from 'lucide-angular';
import { Modal } from '../../../../shared/modal/modal';
import { Employee, EmployeeRole, EmployeeStatus } from '../employee.model';
import { EmployeeService } from '../employee.service';

type FieldName =
  | 'firstName'
  | 'lastName'
  | 'personalId'
  | 'email'
  | 'phone'
  | 'branch'
  | 'position'
  | 'birthDate'
  | 'hireDate';

const ERROR_MESSAGES: Record<string, string> = {
  required: 'This field is required.',
  blank: 'This field is required.',
  email: 'Enter a valid email address.',
  personalId: 'Personal ID must be exactly 11 digits.',
  phone: 'Enter a valid phone number.',
  notInPast: 'Date of birth must be in the past.',
};

@Component({
  selector: 'app-employees-list',
  imports: [DatePipe, FormsModule, LucideAngularModule, Modal, ReactiveFormsModule],
  templateUrl: './employees-list.html',
  styleUrl: './employees-list.css',
})
export class EmployeesList implements OnInit {
  private readonly employeeService = inject(EmployeeService);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly PlusIcon = Plus;
  protected readonly SearchIcon = Search;
  protected readonly today = localToday();

  protected readonly employees = signal<Employee[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly isAddOpen = signal(false);
  protected readonly serverError = signal('');

  // ── Search and filter ─────────────────────────────────────────────────────
  protected readonly search = signal('');
  protected readonly roleFilter = signal<'all' | EmployeeRole>('all');

  protected readonly filteredEmployees = computed(() => {
    const query = this.search().trim().toLowerCase();
    const queryDigits = query.replace(/\D/g, '');
    const role = this.roleFilter();

    return this.employees().filter((employee) => {
      if (role !== 'all' && employee.role !== role) {
        return false;
      }
      if (!query) {
        return true;
      }
      const texts = [
        `${employee.firstName} ${employee.lastName}`,
        employee.personalId,
        employee.email,
        employee.phone,
      ];
      const textMatch = texts.some((text) => text?.toLowerCase().includes(query));
      // Phone numbers also match ignoring spaces, dashes and brackets ("555123" finds "+995 555 12 34").
      const phoneMatch =
        queryDigits.length >= 3 && !!employee.phone?.replace(/\D/g, '').includes(queryDigits);
      return textMatch || phoneMatch;
    });
  });

  protected readonly hasActiveFilters = computed(
    () => this.search().trim() !== '' || this.roleFilter() !== 'all',
  );

  clearFilters(): void {
    this.search.set('');
    this.roleFilter.set('all');
  }

  // Values already used, offered as suggestions while typing.
  protected readonly branches = computed(() => uniqueSorted(this.employees().map((e) => e.branch)));
  protected readonly positions = computed(() =>
    uniqueSorted(this.employees().map((e) => e.position)),
  );

  // ── Add employee form ─────────────────────────────────────────────────────
  protected readonly form = this.fb.group(
    {
      firstName: ['', notBlank],
      lastName: ['', notBlank],
      personalId: ['', [Validators.required, pattern(/^\d{11}$/, 'personalId')]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, pattern(/^\+?[0-9 ()-]{7,20}$/, 'phone')]],
      branch: ['', notBlank],
      position: ['', notBlank],
      birthDate: ['', [Validators.required, inThePast]],
      hireDate: ['', Validators.required],
      endDate: [''], // optional
      role: this.fb.control<EmployeeRole>('staff'),
    },
    { validators: [hireDateAfterBirth, endDateAfterHire] },
  );

  // The status the employee will get, shown live in the form. Same rule as the backend.
  protected formStatus(): EmployeeStatus {
    const endDate = this.form.controls.endDate.value;
    return endDate && endDate <= localToday() ? 'former' : 'active';
  }

  ngOnInit(): void {
    this.loadEmployees();
  }

  loadEmployees(): void {
    this.isLoading.set(true);
    this.employeeService.list().subscribe({
      next: (employees) => {
        this.employees.set(employees);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  openAddForm(): void {
    this.form.reset();
    this.serverError.set('');
    this.isAddOpen.set(true);
  }

  closeAddForm(): void {
    this.isAddOpen.set(false);
  }

  // The first error of a field, once the user has touched it (or tried to submit).
  protected errorFor(name: FieldName): string {
    const control = this.form.controls[name];
    if (!control.touched || !control.errors) {
      return '';
    }
    const key = Object.keys(control.errors)[0];
    return ERROR_MESSAGES[key] ?? 'Invalid value.';
  }

  protected hireDateError(): string {
    return this.form.controls.hireDate.touched && this.form.hasError('hireBeforeBirth')
      ? 'Hire date cannot be before the date of birth.'
      : '';
  }

  protected endDateError(): string {
    return this.form.controls.endDate.touched && this.form.hasError('endBeforeHire')
      ? 'End date cannot be before the hire date.'
      : '';
  }

  addEmployee(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched(); // reveal every error message
      return;
    }

    const value = this.form.getRawValue();
    this.isSaving.set(true);
    this.serverError.set('');
    this.employeeService
      .create({
        ...value,
        firstName: value.firstName.trim(),
        lastName: value.lastName.trim(),
        personalId: value.personalId.trim(),
        email: value.email.trim(),
        phone: value.phone.trim(),
        branch: value.branch.trim(),
        position: value.position.trim(),
        endDate: value.endDate || null,
      })
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.isAddOpen.set(false);
          this.loadEmployees();
        },
        error: (error: HttpErrorResponse) => {
          this.isSaving.set(false);
          // e.g. "An employee with personal ID 01234567890 already exists"
          const message = error.error?.message;
          this.serverError.set(
            Array.isArray(message)
              ? message.join(', ')
              : typeof message === 'string'
                ? message
                : 'Could not add the employee. Is the backend running?',
          );
        },
      });
  }

  deleteEmployee(employee: Employee): void {
    if (!confirm(`Remove ${employee.firstName} ${employee.lastName}?`)) {
      return;
    }
    this.employeeService.remove(employee.id).subscribe(() => this.loadEmployees());
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function uniqueSorted(values: (string | null)[]): string[] {
  return [...new Set(values.filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b));
}

// Like Validators.required, but also rejects text that is only spaces.
function notBlank(control: AbstractControl<string>): ValidationErrors | null {
  return control.value?.trim() ? null : { blank: true };
}

// A regex check that reports its own error key, so each field gets a specific message.
function pattern(regex: RegExp, errorKey: string) {
  return (control: AbstractControl<string>): ValidationErrors | null =>
    !control.value || regex.test(control.value.trim()) ? null : { [errorKey]: true };
}

function inThePast(control: AbstractControl<string>): ValidationErrors | null {
  return !control.value || control.value < localToday() ? null : { notInPast: true };
}

function hireDateAfterBirth(group: AbstractControl): ValidationErrors | null {
  const birth = group.get('birthDate')?.value as string;
  const hire = group.get('hireDate')?.value as string;
  return birth && hire && hire < birth ? { hireBeforeBirth: true } : null;
}

function endDateAfterHire(group: AbstractControl): ValidationErrors | null {
  const hire = group.get('hireDate')?.value as string;
  const end = group.get('endDate')?.value as string;
  return hire && end && end < hire ? { endBeforeHire: true } : null;
}

// Today as 'YYYY-MM-DD' in the user's own time zone (what a date input uses).
function localToday(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
