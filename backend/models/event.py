from datetime import datetime, timezone
from uuid import uuid4

from sqlmodel import Field, SQLModel
from sqlalchemy import Column, DateTime
from sqlalchemy.types import TypeDecorator


class UTCDateTime(TypeDecorator):
    """Keep SQLite timestamps in UTC and return timezone-aware Python values."""

    impl = DateTime
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc).replace(tzinfo=None)

    def process_result_value(self, value, dialect):
        return value.replace(tzinfo=timezone.utc) if value is not None else None


class EventRecord(SQLModel, table=True):
    __tablename__ = "events"

    id: str = Field(
        default_factory=lambda: str(uuid4()),
        primary_key=True,
    )

    title: str = Field(max_length=200)
    description: str = ""

    start: datetime = Field(sa_column=Column(UTCDateTime(), nullable=False))
    end: datetime = Field(sa_column=Column(UTCDateTime(), nullable=False))

    priority: str = "medium"
    category: str = "other"
    status: str = "pending"

    location: str | None = None
    course: str | None = None

    completed: bool = False
