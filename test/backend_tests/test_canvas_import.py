from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from canvasapi.assignment import Assignment
from sqlmodel import Session, select

from backend import main
from backend.models.event import EventRecord
from test.backend_tests.database_case import DatabaseTestCase


class CanvasImportTests(DatabaseTestCase):
    def setUp(self):
        super().setUp()
        self.start = datetime(2026, 11, 10, 10, tzinfo=timezone(timedelta(hours=-6)))
        self.end = self.start + timedelta(hours=1)
        self.assignment = Assignment(MagicMock(), {
            "name": "Research paper",
            "description": "Assignment details",
            "unlock_at_date": self.start,
            "due_at_date": self.end,
            "course_id": 123,
        })
        self.quiz = SimpleNamespace(
            title="Biology quiz", instructions="Quiz details", course_id=123,
            unlock_at_date=self.start, due_at_date=self.end,
        )
        self.calendar_event = SimpleNamespace(
            title="Office hours", description="Meet the instructor",
            workflow_state="locked", start_at_date=self.start,
            end_at_date=self.end, location_name="Library", context_name="Biology",
        )
        self.connection = MagicMock()
        self.connection.getLoadedCourses.return_value = {123: object()}
        self.connection.getContentsOfCourse.return_value = {
            "assignments": [self.assignment], "quizzes": [self.quiz],
        }
        self.connection.getCalendarEvents.return_value = [self.calendar_event]
        cache = patch.dict(main.activeCanvasConnections, {}, clear=True)
        cache.start()
        self.addCleanup(cache.stop)
        factory = patch.object(main, "canvasConnection", return_value=self.connection)
        self.factory = factory.start()
        self.addCleanup(factory.stop)

    def import_events(self):
        return main.pullFromCanvas(main.apiKeyMessage(key="test-token"), session=self.session)

    def test_import_persists_assignments_quizzes_and_calendar_events(self):
        response = self.import_events()
        self.assertEqual(response, {"message": "Events pulled from Canvas."})
        self.factory.assert_called_once_with("test-token")
        self.connection.loadCourses.assert_called_once_with(untilFound=1000)
        self.connection.loadCalendarEvents.assert_called_once_with()
        self.session.close()
        # A new connection must see the committed records and their generated IDs.
        with Session(self.engine) as reader:
            events = {event.title: event for event in reader.exec(select(EventRecord)).all()}
            self.assertEqual(set(events), {"Research paper", "Biology quiz", "Office hours"})
            self.assertEqual(len({event.id for event in events.values()}), 3)
            self.assertTrue(all(event.id for event in events.values()))
            self.assertEqual(events["Research paper"].category, "assignment")
            self.assertEqual(events["Biology quiz"].category, "exam")
            self.assertEqual(events["Research paper"].course, "123")
            self.assertEqual(events["Research paper"].description, "Assignment details")
            self.assertTrue(events["Office hours"].completed)
            self.assertEqual(events["Office hours"].status, "completed")
            self.assertEqual(events["Office hours"].location, "Library")
            self.assertEqual(events["Office hours"].course, "Biology")
            for event in events.values():
                self.assertEqual(event.start, self.start.astimezone(timezone.utc))
                self.assertEqual(event.end, self.end.astimezone(timezone.utc))
                self.assertEqual(event.start.utcoffset(), timedelta(0))
            listed = main.get_events(status_filter=None, session=reader)
            self.assertEqual(listed["total"], 3)

    def test_failed_commit_rolls_back_the_import(self):
        with patch.object(self.session, "commit", side_effect=RuntimeError("Save failed")):
            with self.assertRaisesRegex(RuntimeError, "Save failed"):
                self.import_events()
        with Session(self.engine) as reader:
            self.assertEqual(reader.exec(select(EventRecord)).all(), [])
        # The request session can be used again following rollback.
        self.import_events()
        self.assertEqual(len(self.session.exec(select(EventRecord)).all()), 3)

    def test_empty_import_succeeds_without_creating_records(self):
        self.connection.getContentsOfCourse.return_value = {"assignments": [], "quizzes": []}
        self.connection.getCalendarEvents.return_value = []
        self.import_events()
        self.assertEqual(self.session.exec(select(EventRecord)).all(), [])
