import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink],
  template: `
    <div class="page-stack">
      <div class="page-header">
        <div>
          <p class="page-eyebrow">404</p>
          <h1 class="page-title">Page not found</h1>
          <p class="page-description">
            No page at <code>{{ url }}</code>
          </p>
        </div>
      </div>
      <div class="button-row">
        <a class="button button--primary" routerLink="/">Go home</a>
      </div>
    </div>
  `,
})
export class NotFoundPage {
  protected readonly url = inject(Router).url;
}
