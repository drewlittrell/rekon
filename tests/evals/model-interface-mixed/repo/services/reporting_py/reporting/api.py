class ReportingApi:
    def __init__(self, service):
        self.service = service

    def get_export(self, actor_id, export_id):
        return {"data": self.service.export(actor_id, export_id)}
