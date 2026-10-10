import { Component, input, output, signal } from '@angular/core';
import { Credentials } from '../../core/auth/auth.model';
import { Modal } from '../modal/modal';

// Shows a freshly issued login. The password exists only in this response: the server stores
// just a hash, so it can't be shown again (only reset).
//   <app-credentials-modal [credentials]="credentials()" (closed)="credentials.set(null)" />
@Component({
  selector: 'app-credentials-modal',
  imports: [Modal],
  templateUrl: './credentials-modal.html',
  styleUrl: './credentials-modal.css',
})
export class CredentialsModal {
  readonly credentials = input<Credentials | null>(null);
  readonly title = input('Login ready');
  readonly closed = output<void>();

  protected readonly copied = signal('');

  protected async copy(label: string, value: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      this.copied.set(label);
      setTimeout(() => this.copied.set(''), 1500);
    } catch {
      // clipboard not available: the value is on screen to copy by hand
    }
  }
}
