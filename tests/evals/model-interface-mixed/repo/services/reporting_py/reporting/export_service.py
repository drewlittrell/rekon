class ExportService:
    def __init__(self, repository, policy):
        self.repository = repository
        self.policy = policy

    def export(self, actor_id, export_id):
        record = self.repository.find_export(export_id)
        if record is None:
            raise ValueError("export-not-found")
        self.policy.allowed_fields(actor_id, record)
        return record
