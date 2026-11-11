from pathlib import Path

from sqlalchemy import inspect
from sqlmodel import Session, create_engine

from backend.models.event import EventRecord


database_path = Path(__file__).resolve().parent / "studysync.db"
engine = create_engine(
    f"sqlite:///{database_path}",
    connect_args={"check_same_thread": False},
)


def create_tables():
    with engine.begin() as connection:
        # Serialize startup schema changes when multiple workers start together.
        connection.exec_driver_sql("BEGIN IMMEDIATE")
        EventRecord.metadata.create_all(connection)
        columns = {column["name"] for column in inspect(connection).get_columns("events")}
        if "color" not in columns:
            connection.exec_driver_sql("ALTER TABLE events ADD COLUMN color VARCHAR")


def get_session():
    with Session(engine) as session:
        yield session
