import unittest

from notifications.delivery_service import DeliveryService


class DeliveryServiceTest(unittest.TestCase):
    def test_delivers_to_authorized_active_contact(self):
        contact = {"id": "contact-1", "address": "ari@example.test", "opted_out": False}
        repository = type("Repository", (), {"find_contact": lambda _self, _id: contact})()
        policy = type(
            "Policy",
            (),
            {
                "can_manage": lambda _self, _actor, _contact: True,
                "is_opted_out": lambda _self, value: value["opted_out"],
            },
        )()
        sent = []
        gateway = type("Gateway", (), {"send": lambda _self, address, message: sent.append((address, message))})()

        result = DeliveryService(repository, policy, gateway).deliver(
            "admin-1", "contact-1", "hello"
        )

        self.assertEqual(result, {"status": "sent"})
        self.assertEqual(sent, [("ari@example.test", "hello")])


if __name__ == "__main__":
    unittest.main()
