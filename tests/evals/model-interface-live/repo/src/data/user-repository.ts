export type StoredUser = {
  id: string;
  active: boolean;
};

export interface UserRepository {
  findById(userId: string): Promise<StoredUser | undefined>;
  setActive(userId: string, active: boolean): Promise<StoredUser>;
}
