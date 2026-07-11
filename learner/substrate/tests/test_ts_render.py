import unittest

from learner.substrate.ts_render import render_dashboard_ts as render_ts


class TestTypeScriptRendering(unittest.TestCase):
    def test_render_ts_escapes_string_literals(self):
        text = render_ts(
            {
                "activeUnit": {
                    "title": 'safe"; globalThis.__pwned = true; const x="',
                }
            }
        )

        self.assertIn(
            'title: "safe\\"; globalThis.__pwned = true; const x=\\"",',
            text,
        )
        self.assertNotIn('title: "safe"; globalThis', text)


if __name__ == "__main__":
    unittest.main()
