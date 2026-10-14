import unittest
from datetime import datetime, timezone

from backend import main


class EventDeadlineTests(unittest.TestCase):
    def setUp(self):
        self.saved_events = main.events.copy()
        main.events.clear()

    def tearDown(self):
        main.events.clear()
        main.events.update(self.saved_events)

    def test_assignment_and_exam_deadlines_are_returned_by_event_listing(self):
        assignment_deadline = datetime(2026, 10, 16, 23, 59, tzinfo=timezone.utc)
        exam_deadline = datetime(2026, 10, 19, 8, 0, tzinfo=timezone.utc)
        meeting_end = datetime(2026, 10, 14, 12, 0, tzinfo=timezone.utc)

        main.create_event(
            main.EventInput(
                title="Research paper",
                category=main.Category.assignment,
                start=datetime(2026, 10, 14, 9, 0, tzinfo=timezone.utc),
                end=assignment_deadline,
            )
        )
        main.create_event(
            main.EventInput(
                title="Biology exam",
                category=main.Category.exam,
                start=datetime(2026, 10, 14, 10, 0, tzinfo=timezone.utc),
                end=exam_deadline,
            )
        )
        main.create_event(
            main.EventInput(
                title="Team meeting",
                category=main.Category.meeting,
                start=datetime(2026, 10, 14, 11, 0, tzinfo=timezone.utc),
                end=meeting_end,
            )
        )

        assignment_events = main.get_events(
            category=main.Category.assignment,
            status_filter=None,
        )["events"]
        exam_events = main.get_events(
            category=main.Category.exam,
            status_filter=None,
        )["events"]

        self.assertEqual(len(assignment_events), 1)
        self.assertEqual(assignment_events[0].title, "Research paper")
        self.assertEqual(assignment_events[0].end, assignment_deadline)
        self.assertEqual(len(exam_events), 1)
        self.assertEqual(exam_events[0].title, "Biology exam")
        self.assertEqual(exam_events[0].end, exam_deadline)


if __name__ == "__main__":
    unittest.main()
