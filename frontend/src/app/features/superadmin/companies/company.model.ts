import { AppModule } from '../../../core/auth/auth.model';

export interface Company {
  id: string;
  name: string;
  modules: AppModule[];
  createdAt: string;
  adminName: string | null;
  adminUsername: string | null;
  employeeCount: number;
}

export interface CreateCompanyPayload {
  name: string;
  adminFirstName: string;
  adminLastName: string;
  modules: AppModule[];
}
