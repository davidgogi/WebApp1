import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { LucideAngularModule, Menu, ChevronDown, ChevronRight, Users, Boxes } from 'lucide-angular';

@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, LucideAngularModule],
  templateUrl: './shell.html',
  styleUrl: './shell.css',
})
export class Shell {
  protected readonly MenuIcon = Menu;
  protected readonly ChevronDownIcon = ChevronDown;
  protected readonly ChevronRightIcon = ChevronRight;
  protected readonly UsersIcon = Users;
  protected readonly BoxesIcon = Boxes;

  protected readonly isSidebarOpen = signal(true);
  protected readonly isHrExpanded = signal(true);
  protected readonly isWmsExpanded = signal(true);

  private readonly router = inject(Router);
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  protected readonly isHrActive = computed(() => this.currentUrl().startsWith('/hr'));
  protected readonly isWmsActive = computed(() => this.currentUrl().startsWith('/wms'));

  toggleSidebar(): void {
    this.isSidebarOpen.update((value) => !value);
    console.log(this.currentUrl());
  }

  toggleHrMenu(): void {
    if (!this.isSidebarOpen()) {
      this.isSidebarOpen.set(true);
      this.isHrExpanded.set(true);
      return;
    }

    this.isHrExpanded.update((value) => !value);
  }

  toggleWmsMenu(): void {
    if (!this.isSidebarOpen()) {
      this.isSidebarOpen.set(true);
      this.isWmsExpanded.set(true);
      return;
    }

    this.isWmsExpanded.update((value) => !value);
  }

  count = signal(0);
  doubled = computed(() => this.count() * 2);

  increment() {
    this.count.update((c) => c + 1);
  }
}
