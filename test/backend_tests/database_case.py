import tempfile
import unittest
from pathlib import Path

from sqlmodel import Session, SQLModel, create_engine

from backend.models.event import EventRecord  # Register the events table.


class DatabaseTestCase(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        database_path = Path(directory.name) / "events.db"
        self.engine = create_engine(f"sqlite:///{database_path}")
        self.addCleanup(self.engine.dispose)
        SQLModel.metadata.create_all(self.engine)
        self.session = Session(self.engine)
        self.addCleanup(self.session.close)
