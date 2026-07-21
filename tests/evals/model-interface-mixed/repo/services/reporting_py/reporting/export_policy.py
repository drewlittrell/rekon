class ExportPolicy:
    def allowed_fields(self, actor_id, record):
        raise NotImplementedError
