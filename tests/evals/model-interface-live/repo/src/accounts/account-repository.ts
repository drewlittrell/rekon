export type StoredAccount = {
  id: string;
  status: "active" | "suspended";
};

export interface AccountRepository {
  findById(accountId: string): Promise<StoredAccount | undefined>;
  setStatus(accountId: string, status: StoredAccount["status"]): Promise<StoredAccount>;
}
