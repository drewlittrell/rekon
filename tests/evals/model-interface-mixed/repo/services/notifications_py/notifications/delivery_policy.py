class DeliveryPolicy:
    def can_manage(self, actor_id, contact):
        raise NotImplementedError

    def is_opted_out(self, contact):
        raise NotImplementedError
