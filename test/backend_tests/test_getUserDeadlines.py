import unittest
from datetime import datetime, timezone

from backend import main
from test.backend_tests.database_case import DatabaseTestCase


class GetUserDeadlinesTests(DatabaseTestCase):
    def test_getUserDeadlines(self):
        assignment_deadline = datetime(2026, 10, 16, 23, 59, tzinfo=timezone.utc)
        exam_deadline = datetime(2026, 10, 19, 8, 0, tzinfo=timezone.utc)
        meeting_end = datetime(2026, 10, 14, 12, 0, tzinfo=timezone.utc)

        main.create_event(
            main.EventInput(
                title="Research paper",
                category=main.Category.assignment,
                start=datetime(2026, 10, 14, 9, 0, tzinfo=timezone.utc),
                end=assignment_deadline,
            ),
            session=self.session,
        )
        main.create_event(
            main.EventInput(
                title="Biology exam",
                category=main.Category.exam,
                start=datetime(2026, 10, 14, 10, 0, tzinfo=timezone.utc),
                end=exam_deadline,
            ),
            session=self.session,
        )
        main.create_event(
            main.EventInput(
                title="Team meeting",
                category=main.Category.meeting,
                start=datetime(2026, 10, 14, 11, 0, tzinfo=timezone.utc),
                end=meeting_end,
            ),
            session=self.session,
        )

        deadline_events = [
            event
            for category in (main.Category.assignment, main.Category.exam)
            for event in main.get_events(
                category=category,
                status_filter=None,
                session=self.session,
            )["events"]
        ]
        deadlines = {event.title: event.end for event in deadline_events}

        self.assertEqual(
            deadlines,
            {
                "Research paper": assignment_deadline,
                "Biology exam": exam_deadline,
            },
        )


if __name__ == "__main__":
    unittest.main()
