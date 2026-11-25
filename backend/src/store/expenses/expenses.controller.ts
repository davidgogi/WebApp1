import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { AuthUser } from '../../auth/auth-user.js';
import { Access, CurrentUser, Roles } from '../../auth/decorators.js';
import { UserRole } from '../../auth/user-role.enum.js';
import { AppModuleName } from '../../companies/app-module.enum.js';
import {
  BankAccountDto,
  CreateExpensesDto,
  ExpenseCategoryDto,
  ExpenseTypeDto,
  UpdateBankAccountDto,
  UpdateExpenseCategoryDto,
  UpdateExpenseTypeDto,
  VoidExpenseDto,
} from './dto/expense.dto.js';
import { BankAccountView, ExpenseCategoryView, ExpenseView, ExpenseWorkspace, ExpensesService } from './expenses.service.js';

@Controller('expenses')
@Access(AppModuleName.STORE)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get('workspace')
  workspace(@CurrentUser() user: AuthUser): Promise<ExpenseWorkspace> {
    return this.expensesService.workspace(user);
  }

  @Post()
  @Roles(UserRole.MODULE_ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateExpensesDto): Promise<ExpenseView[]> {
    return this.expensesService.create(user, dto);
  }

  @Post('categories')
  @Roles(UserRole.MODULE_ADMIN)
  createCategory(@CurrentUser() user: AuthUser, @Body() dto: ExpenseCategoryDto): Promise<ExpenseCategoryView[]> {
    return this.expensesService.createCategory(user, dto);
  }

  @Patch('categories/:id')
  @Roles(UserRole.MODULE_ADMIN)
  updateCategory(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExpenseCategoryDto,
  ): Promise<ExpenseCategoryView[]> {
    return this.expensesService.updateCategory(user, id, dto);
  }

  @Delete('categories/:id')
  @Roles(UserRole.MODULE_ADMIN)
  removeCategory(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<ExpenseCategoryView[]> {
    return this.expensesService.removeCategory(user, id);
  }

  @Post('categories/:id/types')
  @Roles(UserRole.MODULE_ADMIN)
  createType(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ExpenseTypeDto,
  ): Promise<ExpenseCategoryView[]> {
    return this.expensesService.createType(user, id, dto);
  }

  @Patch('types/:id')
  @Roles(UserRole.MODULE_ADMIN)
  updateType(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExpenseTypeDto,
  ): Promise<ExpenseCategoryView[]> {
    return this.expensesService.updateType(user, id, dto);
  }

  @Delete('types/:id')
  @Roles(UserRole.MODULE_ADMIN)
  removeType(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<ExpenseCategoryView[]> {
    return this.expensesService.removeType(user, id);
  }

  @Post('bank-accounts')
  @Roles(UserRole.MODULE_ADMIN)
  createBankAccount(@CurrentUser() user: AuthUser, @Body() dto: BankAccountDto): Promise<BankAccountView[]> {
    return this.expensesService.createBankAccount(user, dto);
  }

  @Patch('bank-accounts/:id')
  @Roles(UserRole.MODULE_ADMIN)
  updateBankAccount(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBankAccountDto,
  ): Promise<BankAccountView[]> {
    return this.expensesService.updateBankAccount(user, id, dto);
  }

  @Delete('bank-accounts/:id')
  @Roles(UserRole.MODULE_ADMIN)
  removeBankAccount(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<BankAccountView[]> {
    return this.expensesService.removeBankAccount(user, id);
  }

  @Post(':id/void')
  @Roles(UserRole.MODULE_ADMIN, UserRole.MANAGER)
  voidExpense(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VoidExpenseDto,
  ): Promise<ExpenseView> {
    return this.expensesService.voidExpense(user, id, dto.reason);
  }
}
