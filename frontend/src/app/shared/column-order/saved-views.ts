import { Component, ElementRef, inject, input, output, signal } from '@angular/core';
import { Check, ChevronDown, LucideAngularModule, X } from 'lucide-angular';
import { TranslatePipe } from '../../core/i18n/t.pipe';

export interface SavedView<S> {
  name: string;
  state: S;
}

export class SavedViews<S> {
  private readonly storageKey: string;

  readonly list = signal<SavedView<S>[]>([]);
  readonly active = signal<string | null>(null);

  constructor(tableId: string) {
    this.storageKey = `views:${tableId}`;
    this.list.set(this.load());
  }

  save(name: string, state: S): void {
    const key = name.trim().toLowerCase();
    this.list.update((views) => [...views.filter((view) => view.name.toLowerCase() !== key), { name: name.trim(), state }]);
    this.active.set(name.trim());
    this.store();
  }

  remove(name: string): void {
    this.list.update((views) => views.filter((view) => view.name !== name));
    if (this.active() === name) {
      this.active.set(null);
    }
    this.store();
  }

  private load(): SavedView<S>[] {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(this.storageKey) ?? '[]');
      return Array.isArray(saved)
        ? saved.filter((view): view is SavedView<S> => typeof view?.name === 'string' && 'state' in view)
        : [];
    } catch {
      return [];
    }
  }

  private store(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.list()));
    } catch {
    }
  }
}

@Component({
  selector: 'app-saved-views',
  imports: [TranslatePipe, LucideAngularModule],
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
      {{ 'Views' | t }}
      <lucide-icon [img]="OpenIcon" [size]="14"></lucide-icon>
    </button>
    @if (open()) {
      <div class="menu__panel menu__panel--right">
        <button type="button" class="menu__item" (click)="choose(null)">
          <span class="menu__mark">
            @if (views().active() === null) {
              <lucide-icon [img]="ActiveIcon" [size]="14"></lucide-icon>
            }
          </span>
          {{ 'Default view' | t }}
        </button>
        @for (view of views().list(); track view.name) {
          <div class="menu__row">
            <button type="button" class="menu__item" (click)="choose(view)">
              <span class="menu__mark">
                @if (views().active() === view.name) {
                  <lucide-icon [img]="ActiveIcon" [size]="14"></lucide-icon>
                }
              </span>
              {{ view.name }}
            </button>
            <button
              type="button"
              class="menu__remove"
              [title]="'Delete view' | t"
              [attr.aria-label]="'Delete view {name}' | t: { name: view.name }"
              (click)="views().remove(view.name)"
            >
              <lucide-icon [img]="RemoveIcon" [size]="14"></lucide-icon>
            </button>
          </div>
        }
        <div class="menu__divider"></div>
        <form class="menu__save" (submit)="$event.preventDefault(); save()">
          <input
            class="text-input"
            type="text"
            maxlength="40"
            [placeholder]="'Name of this view' | t"
            [value]="name()"
            (input)="name.set($any($event.target).value)"
          />
          <button type="submit" class="button button--primary button--sm" [disabled]="!name().trim()">
            {{ 'Save view' | t }}
          </button>
        </form>
        <p class="menu__hint">{{ 'Saves the search, filters and columns in this browser.' | t }}</p>
      </div>
    }
  `,
})
export class SavedViewsMenu {
  private readonly host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;

  readonly views = input.required<SavedViews<unknown>>();
  readonly capture = input.required<() => unknown>();
  readonly applied = output<unknown | null>();

  protected readonly OpenIcon = ChevronDown;
  protected readonly ActiveIcon = Check;
  protected readonly RemoveIcon = X;
  protected readonly open = signal(false);
  protected readonly name = signal('');

  outside(event: MouseEvent): void {
    if (this.open() && (event.target as Node).isConnected && !this.host.contains(event.target as Node)) {
      this.open.set(false);
    }
  }

  choose(view: SavedView<unknown> | null): void {
    this.views().active.set(view?.name ?? null);
    this.applied.emit(view?.state ?? null);
    this.open.set(false);
  }

  save(): void {
    const name = this.name().trim();
    if (!name) {
      return;
    }
    this.views().save(name, this.capture()());
    this.name.set('');
    this.open.set(false);
  }
}
