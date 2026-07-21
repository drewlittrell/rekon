import { AccountService } from "../accounts/account-service.ts";

export class AccountController {
  constructor(private readonly accounts: AccountService) {}

  async reactivate(request: { accountId: string }): Promise<{ status: string }> {
    return this.accounts.reactivate(request.accountId);
  }
}
