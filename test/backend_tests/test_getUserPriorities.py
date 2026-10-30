import unittest
from datetime import datetime, timezone

from backend import main


class GetUserPrioritiesTests(unittest.TestCase):
    def setUp(self):
        self.saved_events = main.events.copy()
        main.events.clear()

    def tearDown(self):
        main.events.clear()
        main.events.update(self.saved_events)

    def test_getUserPriorities(self):
        start = datetime(2026, 10, 14, 9, 0, tzinfo=timezone.utc)
        end = datetime(2026, 10, 14, 10, 0, tzinfo=timezone.utc)
        events_to_create = [
            ("Research paper", main.Category.assignment, main.Priority.high),
            ("Biology exam", main.Category.exam, main.Priority.urgent),
            ("Team meeting", main.Category.meeting, main.Priority.low),
        ]

        for title, category, priority in events_to_create:
            main.create_event(
                main.EventInput(
                    title=title,
                    category=category,
                    priority=priority,
                    start=start,
                    end=end,
                )
            )

        priority_events = [
            event
            for category in (main.Category.assignment, main.Category.exam)
            for event in main.get_events(
                category=category,
                status_filter=None,
            )["events"]
        ]
        priorities = {event.title: event.priority for event in priority_events}

        self.assertEqual(
            priorities,
            {
                "Research paper": main.Priority.high,
                "Biology exam": main.Priority.urgent,
            },
        )


if __name__ == "__main__":
    unittest.main()
