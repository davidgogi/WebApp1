import { Component, ElementRef, inject, input, signal } from '@angular/core';
import { TranslatePipe } from '../../core/i18n/t.pipe';
import { ColumnOrder } from './column-order';

@Component({
  selector: 'app-column-picker',
  imports: [TranslatePipe],
  host: {
    class: 'menu',
    '(document:click)': 'outside($event)',
    '(document:keydown.escape)': 'open.set(false)',
  },
  template: `
    <button
      type="button"
      class="button button--outline"
      [attr.aria-expanded]="open()"
      (click)="open.set(!open())"
    >
      {{ 'Columns' | t }}
    </button>
    @if (open()) {
      <div class="menu__panel menu__panel--right">
        <div class="menu__title">{{ 'Shown columns' | t }}</div>
        @for (column of columns().available(); track column.key) {
          <label class="menu__check">
            <input
              type="checkbox"
              [checked]="!columns().isHidden(column.key)"
              [disabled]="!columns().isHidden(column.key) && columns().columns().length === 1"
              (change)="columns().toggle(column.key)"
            />
            {{ column.label | t }}
          </label>
        }
        <div class="menu__divider"></div>
        <button
          type="button"
          class="menu__item"
          [disabled]="!columns().isCustom()"
          (click)="columns().reset(); open.set(false)"
        >
          {{ 'Reset columns' | t }}
        </button>
      </div>
    }
  `,
})
export class ColumnPicker {
  private readonly host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;

  readonly columns = input.required<ColumnOrder<string>>({ alias: 'columnOrder' });

  protected readonly open = signal(false);

  outside(event: MouseEvent): void {
    if (this.open() && (event.target as Node).isConnected && !this.host.contains(event.target as Node)) {
      this.open.set(false);
    }
  }
}
