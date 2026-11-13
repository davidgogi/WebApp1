import { Component, ElementRef, OnDestroy, computed, inject, input, output, signal } from '@angular/core';
import { Funnel, LucideAngularModule } from 'lucide-angular';
import { TranslatePipe } from '../../core/i18n/t.pipe';

export interface FilterOption {
  value: string;
  label: string;
}

const PANEL_WIDTH = 280;

@Component({
  selector: 'app-column-filter',
  imports: [TranslatePipe, LucideAngularModule],
  host: {
    class: 'column-filter',
    '(document:click)': 'outside($event)',
    '(document:keydown.escape)': 'close()',
    '(window:resize)': 'close()',
  },
  template: `
    <button
      type="button"
      class="column-filter__button"
      [class.column-filter__button--active]="selected() !== null"
      [title]="'Filter' | t"
      [attr.aria-label]="'Filter {name}' | t: { name: title() }"
      [attr.aria-expanded]="open()"
      (click)="toggle($event)"
    >
      <lucide-icon [img]="FilterIcon" [size]="12"></lucide-icon>
    </button>
    @if (open()) {
      <div
        class="column-filter__panel"
        role="dialog"
        [attr.aria-label]="title()"
        [style.top.px]="top()"
        [style.left.px]="left()"
        (click)="$event.stopPropagation()"
      >
        <div class="column-filter__title">{{ title() }}</div>
        <input
          class="text-input"
          type="search"
          [placeholder]="'Search values' | t"
          [value]="query()"
          (input)="query.set($any($event.target).value)"
        />
        <div class="column-filter__list">
          @for (option of shown(); track option.value) {
            <label class="column-filter__option">
              <input type="checkbox" [checked]="draft().has(option.value)" (change)="flip(option.value)" />
              <span>{{ option.label || '—' }}</span>
            </label>
          } @empty {
            <p class="muted">{{ 'No matching values' | t }}</p>
          }
        </div>
        <div class="button-row">
          <button type="button" class="button button--outline button--sm" (click)="clearSelection()">
            {{ 'Clear selection' | t }}
          </button>
          <button type="button" class="button button--outline button--sm" (click)="clear()">
            {{ 'Clear' | t }}
          </button>
        </div>
        <div>
          <button type="button" class="button button--primary button--sm" (click)="apply()">
            {{ 'Apply' | t }}
          </button>
        </div>
      </div>
    }
  `,
})
export class ColumnFilter implements OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;

  readonly title = input.required<string>();
  readonly options = input.required<FilterOption[]>();
  readonly selected = input<string[] | null>(null);
  readonly applied = output<string[] | null>();

  protected readonly FilterIcon = Funnel;
  protected readonly open = signal(false);
  protected readonly query = signal('');
  protected readonly draft = signal(new Set<string>());
  protected readonly top = signal(0);
  protected readonly left = signal(0);
  protected readonly shown = computed(() => {
    const query = this.query().trim().toLowerCase();
    return query
      ? this.options().filter((option) => option.label.toLowerCase().includes(query))
      : this.options();
  });

  private readonly onScroll = (event: Event) => {
    if (!this.host.contains(event.target as Node)) {
      this.close();
    }
  };

  toggle(event: MouseEvent): void {
    event.stopPropagation();
    if (this.open()) {
      this.close();
      return;
    }
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.top.set(rect.bottom + 4);
    this.left.set(Math.max(8, Math.min(rect.left, window.innerWidth - PANEL_WIDTH - 8)));
    const selected = this.selected();
    this.draft.set(new Set(selected ?? this.options().map((option) => option.value)));
    this.query.set('');
    this.setDraggable(false);
    document.addEventListener('scroll', this.onScroll, true);
    this.open.set(true);
  }

  outside(event: MouseEvent): void {
    if (this.open() && (event.target as Node).isConnected && !this.host.contains(event.target as Node)) {
      this.close();
    }
  }

  close(): void {
    if (!this.open()) {
      return;
    }
    this.open.set(false);
    this.setDraggable(true);
    document.removeEventListener('scroll', this.onScroll, true);
  }

  flip(value: string): void {
    this.draft.update((values) => {
      const next = new Set(values);
      if (!next.delete(value)) {
        next.add(value);
      }
      return next;
    });
  }

  clearSelection(): void {
    this.draft.set(new Set());
  }

  clear(): void {
    this.applied.emit(null);
    this.close();
  }

  apply(): void {
    const draft = this.draft();
    const all = this.options().every((option) => draft.has(option.value));
    this.applied.emit(all ? null : [...draft]);
    this.close();
  }

  ngOnDestroy(): void {
    document.removeEventListener('scroll', this.onScroll, true);
  }

  private setDraggable(on: boolean): void {
    const header = this.host.closest('th');
    if (header?.classList.contains('th-draggable')) {
      header.setAttribute('draggable', String(on));
    }
  }
}
