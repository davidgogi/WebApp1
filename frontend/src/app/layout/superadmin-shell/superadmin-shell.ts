import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LucideAngularModule, LogOut } from 'lucide-angular';
import { AuthService } from '../../core/auth/auth.service';

// The superuser's frame: a dark top bar instead of the company sidebar, so the two sides
// can't be mistaken for each other.
@Component({
  selector: 'app-superadmin-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, LucideAngularModule],
  templateUrl: './superadmin-shell.html',
})
export class SuperadminShell {
  protected readonly auth = inject(AuthService);
  protected readonly LogOutIcon = LogOut;
}
