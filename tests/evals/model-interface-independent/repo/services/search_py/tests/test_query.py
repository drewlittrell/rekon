import unittest

from search.query import normalize_query


class QueryTest(unittest.TestCase):
    def test_normalizes_query(self):
        self.assertEqual(normalize_query("  Hello   World "), "hello world")


if __name__ == "__main__":
    unittest.main()
