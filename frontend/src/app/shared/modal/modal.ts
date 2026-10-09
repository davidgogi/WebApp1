import { Component, ElementRef, effect, input, output, viewChild } from '@angular/core';
import { LucideAngularModule, X } from 'lucide-angular';

let nextId = 0;

// A dialog window over the page. Built on the native <dialog> element, which gives focus
// handling and Escape-to-close for free. The parent controls it:
//   <app-modal [open]="isOpen()" title="..." (closed)="isOpen.set(false)"> ...content... </app-modal>
@Component({
  selector: 'app-modal',
  imports: [LucideAngularModule],
  templateUrl: './modal.html',
  styleUrl: './modal.css',
})
export class Modal {
  readonly open = input(false);
  readonly title = input('');

  // Emitted when the user asks to close it (× button, Escape, click outside). The parent
  // decides what happens, usually setting its `open` value back to false.
  readonly closed = output<void>();

  protected readonly XIcon = X;
  protected readonly titleId = `modal-title-${nextId++}`;
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    // Keep the native dialog in sync with the `open` input.
    effect(() => {
      const dialog = this.dialog().nativeElement;
      if (this.open() && !dialog.open) {
        dialog.showModal();
      } else if (!this.open() && dialog.open) {
        dialog.close();
      }
    });
  }

  protected onCancel(event: Event): void {
    event.preventDefault(); // Escape: let the parent close it, so its state stays in sync
    this.closed.emit();
  }

  protected onDialogClick(event: MouseEvent): void {
    // The panel fills the dialog, so a click whose target is the dialog itself hit the backdrop.
    if (event.target === this.dialog().nativeElement) {
      this.closed.emit();
    }
  }
}
