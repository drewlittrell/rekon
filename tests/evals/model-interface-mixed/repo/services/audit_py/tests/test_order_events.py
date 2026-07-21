import unittest

from audit.order_events import record_order_cancellation


class OrderEventsTest(unittest.TestCase):
    def test_records_operator_cancellation(self):
        self.assertEqual(
            record_order_cancellation(
                {"type": "order.cancelled", "orderId": "order-1", "source": "operator"}
            ),
            {"action": "order.cancelled", "subject": "order-1", "source": "operator"},
        )


if __name__ == "__main__":
    unittest.main()
