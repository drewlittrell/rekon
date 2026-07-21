import unittest

from reporting.export_service import ExportService


class ExportServiceTest(unittest.TestCase):
    def test_returns_allowed_export_fields(self):
        record = {"id": "export-1", "name": "Ari"}
        repository = type("Repository", (), {"find_export": lambda _self, _id: record})()
        policy = type("Policy", (), {"allowed_fields": lambda _self, _actor, value: set(value)})()

        self.assertEqual(
            ExportService(repository, policy).export("admin-1", "export-1"),
            record,
        )


if __name__ == "__main__":
    unittest.main()
