import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Employee, EmployeeRole } from '../employee.model';
import { EmployeeService } from '../employee.service';

@Component({
  selector: 'app-employees-list',
  imports: [FormsModule],
  templateUrl: './employees-list.html',
  styleUrl: './employees-list.css',
})
export class EmployeesList implements OnInit {
  private readonly employeeService = inject(EmployeeService);

  protected readonly employees = signal<Employee[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);

  protected readonly firstName = signal('');
  protected readonly lastName = signal('');
  protected readonly role = signal<EmployeeRole>('staff');

  // TEMP DEMO: an input, filled by the router from the route's `data` (see hr.routes.ts)
  readonly demoValue = input<string>();
  protected readonly seenInConstructor = signal('');
  protected readonly seenInNgOnInit = signal('');

  constructor() {
    console.log('constructor sees demoValue =', this.demoValue()); // TEMP DEMO
    this.seenInConstructor.set(String(this.demoValue())); // TEMP DEMO
  }

  ngOnInit(): void {
    console.log('ngOnInit sees demoValue =', this.demoValue()); // TEMP DEMO
    this.seenInNgOnInit.set(String(this.demoValue())); // TEMP DEMO
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

  addEmployee(): void {
    if (!this.firstName().trim() || !this.lastName().trim()) {
      return;
    }

    this.isSaving.set(true);
    this.employeeService
      .create({
        firstName: this.firstName().trim(),
        lastName: this.lastName().trim(),
        role: this.role(),
      })
      .subscribe({
        next: () => {
          this.firstName.set('');
          this.lastName.set('');
          this.role.set('staff');
          this.isSaving.set(false);
          this.loadEmployees();
        },
        error: () => this.isSaving.set(false),
      });
  }

  deleteEmployee(id: string): void {
    this.employeeService.remove(id).subscribe(() => this.loadEmployees());
  }
}
