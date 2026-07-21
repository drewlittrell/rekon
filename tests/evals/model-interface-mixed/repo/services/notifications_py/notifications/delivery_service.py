class DeliveryService:
    def __init__(self, repository, policy, gateway):
        self.repository = repository
        self.policy = policy
        self.gateway = gateway

    def deliver(self, actor_id, contact_id, message):
        contact = self.repository.find_contact(contact_id)
        if contact is None:
            raise ValueError("contact-not-found")
        self.gateway.send(contact["address"], message)
        if not self.policy.can_manage(actor_id, contact):
            raise ValueError("not-authorized")
        if self.policy.is_opted_out(contact):
            return {"status": "suppressed"}
        return {"status": "sent"}
