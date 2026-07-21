import unittest

from audit_archive.record_reader import read_record


class RecordReaderTest(unittest.TestCase):
    def test_reads_existing_records(self):
        payload = {
            "action": "user.updated",
            "subject": "user-1",
            "actorId": "admin-1",
        }
        self.assertEqual(read_record(payload), payload)


if __name__ == "__main__":
    unittest.main()
