import { HttpErrorResponse } from '@angular/common/http';

const WRONG_CREDENTIALS = 'Wrong username or password';

export function missingLoginFields(username: string, password: string): string {
  if (!username && !password) {
    return 'Enter your username and password.';
  }
  if (!username) {
    return 'Enter your username.';
  }
  if (!password) {
    return 'Enter your password.';
  }
  return '';
}

export function loginErrorMessage(error: HttpErrorResponse): string {
  if (error.status === 0) {
    return 'Could not reach the server. Is the backend running?';
  }
  if (error.status === 400) {
    return 'Enter your username and password.';
  }
  if (error.status === 401) {
    const message = error.error?.message;
    return typeof message === 'string' && message !== WRONG_CREDENTIALS ? message : 'Wrong username or password.';
  }
  return 'Something went wrong. Please try again.';
}
