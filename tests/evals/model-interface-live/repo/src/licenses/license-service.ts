export type StoredLicense = {
  id: string;
  status: "active" | "expired";
};

export interface LicenseRepository {
  save(license: StoredLicense): Promise<StoredLicense>;
}

export class LicenseService {
  private readonly repository: LicenseRepository;

  constructor(repository: LicenseRepository) {
    this.repository = repository;
  }

  async renew(license: StoredLicense): Promise<StoredLicense> {
    if (license.status === "expired") throw new Error("license-expired");
    return this.repository.save({ ...license, status: "active" });
  }
}
