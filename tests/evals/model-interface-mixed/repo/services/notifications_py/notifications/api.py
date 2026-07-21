class NotificationApi:
    def __init__(self, service):
        self.service = service

    def post_delivery(self, actor_id, contact_id, message):
        return self.service.deliver(actor_id, contact_id, message)
