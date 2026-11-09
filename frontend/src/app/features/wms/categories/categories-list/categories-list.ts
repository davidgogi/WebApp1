import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ChevronDown, ChevronRight, LucideAngularModule, PenLine, Plus, Search, Trash2 } from 'lucide-angular';
import { AuthService } from '../../../../core/auth/auth.service';
import { Modal } from '../../../../shared/modal/modal';
import { Pager } from '../../../../shared/pager/pager';
import { Pagination } from '../../../../shared/pager/pagination';
import { ProductTabs } from '../../products/product-tabs/product-tabs';
import { Category, CategoryStatus, ProductGroup } from '../category.model';
import { CategoryService } from '../category.service';
import { TranslatePipe } from '../../../../core/i18n/t.pipe';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { ColumnHeader, ColumnTable } from '../../../../shared/column-order/column-header';
import { ColumnTools } from '../../../../shared/column-order/column-tools';
import { ColumnOrder } from '../../../../shared/column-order/column-order';

@Component({
  selector: 'app-categories-list',
  imports: [ColumnHeader, ColumnTable, ColumnTools, TranslatePipe, FormsModule, LucideAngularModule, Modal, Pager, ProductTabs],
  templateUrl: './categories-list.html',
  styleUrl: './categories-list.css',
})
export class CategoriesList implements OnInit {
  private readonly i18n = inject(I18nService);
  protected readonly columnOrder = new ColumnOrder('wms-categories', [
    { key: 'category', label: 'Category' },
    { key: 'groups', label: 'Groups' },
    { key: 'description', label: 'Description' },
    { key: 'products', label: 'Products' },
    { key: 'status', label: 'Status' },
  ]);
  private readonly categoryService = inject(CategoryService);
  private readonly auth = inject(AuthService);

  protected readonly canManage = computed(() => this.auth.user()?.role === 'module_admin');

  protected readonly EditIcon = PenLine;
  protected readonly DeleteIcon = Trash2;
  protected readonly PlusIcon = Plus;
  protected readonly SearchIcon = Search;
  protected readonly ExpandIcon = ChevronRight;
  protected readonly CollapseIcon = ChevronDown;

  protected readonly categories = signal<Category[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly search = signal('');
  protected readonly statusFilter = signal<'all' | CategoryStatus>('all');
  protected readonly hasFilters = computed(() => this.search().trim() !== '' || this.statusFilter() !== 'all');
  protected readonly filtered = computed(() => {
    const query = this.search().trim().toLowerCase();
    const status = this.statusFilter();
    return this.categories().filter(
      (c) =>
        (status === 'all' || c.status === status) &&
        (!query || [c.name, c.description ?? '', ...c.groups.map((g) => g.name)].some((value) => value.toLowerCase().includes(query))),
    );
  });
  protected readonly pages = new Pagination(
    () => this.filtered(),
    () => [this.search(), this.statusFilter()],
  );

  protected readonly isFormOpen = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly formError = signal('');
  protected readonly editingId = signal<string | null>(null);
  protected readonly name = signal('');
  protected readonly description = signal('');
  protected readonly status = signal<CategoryStatus>('active');

  protected readonly expanded = signal<ReadonlySet<string>>(new Set());

  protected readonly groupFormCategory = signal<Category | null>(null);
  protected readonly editingGroup = signal<ProductGroup | null>(null);
  protected readonly groupName = signal('');
  protected readonly groupStatus = signal<CategoryStatus>('active');
  protected readonly groupFormError = signal('');
  protected readonly isSavingGroup = signal(false);

  protected readonly deleting = signal<{ category: Category; group: ProductGroup | null } | null>(null);
  protected readonly moveCategoryId = signal('');
  protected readonly moveGroupId = signal('');
  protected readonly deleteError = signal('');
  protected readonly isDeleting = signal(false);
  protected readonly moveCategories = computed(() => {
    const current = this.deleting()?.category.id;
    return this.categories().filter((c) => c.status === 'active' && c.id !== current);
  });
  protected readonly moveGroups = computed(() => {
    const deleting = this.deleting();
    if (!deleting) {
      return [];
    }
    if (deleting.group) {
      return deleting.category.groups.filter((g) => g.status === 'active' && g.id !== deleting.group!.id);
    }
    return this.categories().find((c) => c.id === this.moveCategoryId())?.groups.filter((g) => g.status === 'active') ?? [];
  });
  protected readonly deletingCount = computed(() => {
    const deleting = this.deleting();
    return deleting ? (deleting.group ?? deleting.category).productCount : 0;
  });

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.isLoading.set(true);
    this.categoryService.list().subscribe({
      next: (categories) => {
        this.categories.set(categories);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load categories. Is the backend running?');
        this.isLoading.set(false);
      },
    });
  }

  clearFilters(): void {
    this.search.set('');
    this.statusFilter.set('all');
  }

  openAddForm(): void {
    this.editingId.set(null);
    this.name.set('');
    this.description.set('');
    this.status.set('active');
    this.formError.set('');
    this.isFormOpen.set(true);
  }

  editCategory(category: Category): void {
    this.editingId.set(category.id);
    this.name.set(category.name);
    this.description.set(category.description ?? '');
    this.status.set(category.status);
    this.formError.set('');
    this.isFormOpen.set(true);
  }

  saveCategory(): void {
    if (!this.name().trim()) {
      this.formError.set('The category name is required.');
      return;
    }
    const payload = {
      name: this.name().trim(),
      description: this.description().trim() || null,
      status: this.status(),
    };
    const id = this.editingId();
    const request = id ? this.categoryService.update(id, payload) : this.categoryService.create(payload);
    this.isSaving.set(true);
    this.formError.set('');
    request.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.isFormOpen.set(false);
        this.loadCategories();
      },
      error: (error: HttpErrorResponse) => {
        this.isSaving.set(false);
        const message = error.error?.message;
        this.formError.set(typeof message === 'string' ? message : 'Could not save the category.');
      },
    });
  }

  toggle(category: Category): void {
    this.expanded.update((current) => {
      const next = new Set(current);
      if (!next.delete(category.id)) {
        next.add(category.id);
      }
      return next;
    });
  }

  openGroupForm(category: Category, group: ProductGroup | null): void {
    this.groupFormCategory.set(category);
    this.editingGroup.set(group);
    this.groupName.set(group?.name ?? '');
    this.groupStatus.set(group?.status ?? 'active');
    this.groupFormError.set('');
  }

  saveGroup(): void {
    const category = this.groupFormCategory();
    if (!category) {
      return;
    }
    const name = this.groupName().trim();
    if (!name) {
      this.groupFormError.set('The group name is required.');
      return;
    }
    const payload = { name, status: this.groupStatus() };
    const group = this.editingGroup();
    const request = group
      ? this.categoryService.updateGroup(category.id, group.id, payload)
      : this.categoryService.createGroup(category.id, payload);
    this.isSavingGroup.set(true);
    this.groupFormError.set('');
    request.subscribe({
      next: () => {
        this.isSavingGroup.set(false);
        this.groupFormCategory.set(null);
        this.expanded.update((current) => new Set(current).add(category.id));
        this.loadCategories();
      },
      error: (error: HttpErrorResponse) => {
        this.isSavingGroup.set(false);
        const message = error.error?.message;
        this.groupFormError.set(typeof message === 'string' ? message : 'Could not save the group.');
      },
    });
  }

  deleteCategory(category: Category): void {
    this.startDelete(category, null);
  }

  deleteGroup(category: Category, group: ProductGroup): void {
    this.startDelete(category, group);
  }

  private startDelete(category: Category, group: ProductGroup | null): void {
    this.errorMessage.set('');
    if ((group ?? category).productCount > 0) {
      this.moveCategoryId.set('');
      this.moveGroupId.set('');
      this.deleteError.set('');
      this.deleting.set({ category, group });
      return;
    }
    const question = group ? 'Delete the group {name}?' : 'Delete the category {name}?';
    if (!this.i18n.confirm(this.i18n.t(question, { name: (group ?? category).name }))) {
      return;
    }
    const request = group
      ? this.categoryService.removeGroup(category.id, group.id)
      : this.categoryService.remove(category.id);
    request.subscribe({
      next: () => this.loadCategories(),
      error: (error: HttpErrorResponse) =>
        this.errorMessage.set(error.error?.message ?? 'Could not delete it.'),
    });
  }

  changeMoveCategory(id: string): void {
    this.moveCategoryId.set(id);
    this.moveGroupId.set('');
  }

  confirmDelete(): void {
    const deleting = this.deleting();
    if (!deleting) {
      return;
    }
    const { category, group } = deleting;
    if (!group && !this.moveCategoryId()) {
      this.deleteError.set('Choose a category to move the products to.');
      return;
    }
    const groupId = this.moveGroupId();
    const request = group
      ? this.categoryService.removeGroup(
          category.id,
          group.id,
          groupId ? { moveToGroupId: groupId } : { noGroup: 'true' },
        )
      : this.categoryService.remove(category.id, {
          moveToCategoryId: this.moveCategoryId(),
          ...(groupId ? { moveToGroupId: groupId } : {}),
        });
    this.isDeleting.set(true);
    this.deleteError.set('');
    request.subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.deleting.set(null);
        this.loadCategories();
      },
      error: (error: HttpErrorResponse) => {
        this.isDeleting.set(false);
        const message = error.error?.message;
        this.deleteError.set(typeof message === 'string' ? message : 'Could not delete it.');
      },
    });
  }

  protected deleteTitle(category: Category): string {
    if (!this.canManage()) {
      return 'Only the WMS admin can delete';
    }
    return 'Delete';
  }
}
