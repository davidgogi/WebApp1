import { isDevMode } from '@angular/core';

// `ng serve` talks to the local API; a production build is served by nginx, which forwards /api to the backend.
export const API_BASE_URL = isDevMode() ? 'http://localhost:3000' : '/api';
