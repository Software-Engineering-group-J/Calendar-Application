import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

from sqlalchemy import inspect
from sqlmodel import Session, create_engine

from backend import database, main
from backend.models.event import EventRecord
from test.backend_tests.database_case import DatabaseTestCase


class CourseColorTests(DatabaseTestCase):
    def test_create_replace_patch_and_clear_color_survive_new_sessions(self):
        start = datetime(2026, 11, 10, tzinfo=timezone.utc)
        payload = main.EventInput(
            title="Biology", category=main.Category.course, color="#ff0000",
            start=start, end=start + timedelta(days=1),
        )
        saved = main.create_event(payload, session=self.session)
        identifier = saved.id
        self.session.close()
        with Session(self.engine) as session:
            self.assertEqual(main.get_event(identifier, session).color, "#ff0000")
            updated = payload.model_copy(update={"color": "#00ff00"})
            main.update_event(identifier, updated, session)
        with Session(self.engine) as session:
            self.assertEqual(main.get_event(identifier, session).color, "#00ff00")
            main.patch_event(identifier, main.EventUpdate(color="#0000ff"), session)
        with Session(self.engine) as session:
            self.assertEqual(main.get_event(identifier, session).color, "#0000ff")
            main.patch_event(identifier, main.EventUpdate(color=None), session)
        with Session(self.engine) as session:
            self.assertIsNone(main.get_event(identifier, session).color)


class ColorSchemaUpgradeTests(unittest.TestCase):
    def test_existing_database_is_upgraded_once_and_preserves_events(self):
        with tempfile.TemporaryDirectory() as folder:
            engine = create_engine(f"sqlite:///{Path(folder) / 'legacy.db'}")
            try:
                with engine.begin() as connection:
                    connection.exec_driver_sql('''
                        CREATE TABLE events (
                            id VARCHAR PRIMARY KEY, title VARCHAR NOT NULL,
                            description VARCHAR NOT NULL, start DATETIME NOT NULL,
                            end DATETIME NOT NULL, priority VARCHAR NOT NULL,
                            category VARCHAR NOT NULL, status VARCHAR NOT NULL,
                            location VARCHAR, course VARCHAR, completed BOOLEAN NOT NULL
                        )
                    ''')
                    connection.exec_driver_sql('''
                        INSERT INTO events VALUES (
                            'existing', 'Biology', '', '2026-11-10 00:00:00',
                            '2026-11-11 00:00:00', 'medium', 'course', 'pending',
                            NULL, NULL, 0
                        )
                    ''')
                with patch.object(database, "engine", engine):
                    database.create_tables()
                    database.create_tables()
                columns = inspect(engine).get_columns("events")
                self.assertEqual(sum(column["name"] == "color" for column in columns), 1)
                with Session(engine) as session:
                    existing = session.get(EventRecord, "existing")
                    self.assertEqual(existing.title, "Biology")
                    self.assertIsNone(existing.color)
                    existing.color = "#ff0000"
                    session.add(existing)
                    session.commit()
                engine.dispose()
                with Session(engine) as session:
                    self.assertEqual(session.get(EventRecord, "existing").color, "#ff0000")
            finally:
                engine.dispose()
