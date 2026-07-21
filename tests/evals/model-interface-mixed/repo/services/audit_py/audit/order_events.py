ORDER_CANCELLATION_SOURCES = {"customer", "operator"}


def record_order_cancellation(event):
    if event.get("type") != "order.cancelled":
        raise ValueError("unsupported-event")
    if event.get("source") not in ORDER_CANCELLATION_SOURCES:
        raise ValueError("invalid-cancellation-source")
    return {
        "action": "order.cancelled",
        "subject": event["orderId"],
        "source": event["source"],
    }
