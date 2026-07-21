REQUIRED_FIELDS = {"action", "subject", "actorId"}
ALLOWED_FIELDS = REQUIRED_FIELDS


def read_record(payload):
    missing = REQUIRED_FIELDS - set(payload)
    if missing:
        raise ValueError("missing-audit-field")
    if set(payload) - ALLOWED_FIELDS:
        raise ValueError("unknown-audit-field")
    return {key: payload[key] for key in ("action", "subject", "actorId")}
