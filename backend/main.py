from __future__ import annotations


from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ValidationError
from contextlib import asynccontextmanager
from backend.models.event import EventRecord
from backend.database import create_tables, get_session
from sqlmodel import Session, select

# ============================================================
# STUDYSYNC API CONFIGURATION
# ============================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    yield

app = FastAPI(
    title="StudySync API",
    description=(
        "Backend API for the StudySync academic planner. "
        "Manage calendar events, priorities, categories, "
        "study sessions, and scheduling conflicts."
    ),
    version="1.0.0",
    lifespan=lifespan,
)


# Allow the React/Vite development server to access the API.
# Add production frontend origins before deploying.

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# EVENT CATEGORIES AND PRIORITIES
# ============================================================

class Priority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    urgent = "urgent"


class Category(str, Enum):
    study = "study"
    assignment = "assignment"
    exam = "exam"
    meeting = "meeting"
    personal = "personal"
    other = "other"


class EventStatus(str, Enum):
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"


# ============================================================
# PYDANTIC DATA MODELS
# ============================================================

class EventInput(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = ""

    start: datetime
    end: datetime

    priority: Priority = Priority.medium
    category: Category = Category.other
    status: EventStatus = EventStatus.pending

    location: Optional[str] = None
    course: Optional[str] = None

    completed: bool = False


class Event(EventInput):
    id: str


class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None

    start: Optional[datetime] = None
    end: Optional[datetime] = None

    priority: Optional[Priority] = None
    category: Optional[Category] = None
    status: Optional[EventStatus] = None

    location: Optional[str] = None
    course: Optional[str] = None

    completed: Optional[bool] = None


# ============================================================
# DATABASE STORAGE
# ============================================================

# Each request uses a session supplied by get_session.


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def validate_event_times(start: datetime, end: datetime):
    if (start.tzinfo is None) != (end.tzinfo is None):
        raise HTTPException(
            status_code=422,
            detail="Start and end must both include timezones or both omit them.",
        )

    if end <= start:
        raise HTTPException(
            status_code=422,
            detail="Event end time must be after start time.",
        )


def event_duration_hours(event: Event) -> float:
    duration = event.end - event.start
    return duration.total_seconds() / 3600


def event_overlaps(first: Event, second: Event) -> bool:
    return (
        normalized_utc(first.start) < normalized_utc(second.end)
        and normalized_utc(second.start) < normalized_utc(first.end)
    )


def get_event_or_404(event_id: str, session: Session) -> EventRecord:
    event = session.get(EventRecord, event_id)

    if event is None:
        raise HTTPException(
            status_code=404,
            detail="Event not found.",
        )

    return event


def normalized_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)

    return value.astimezone(timezone.utc)


def database_values(event: EventInput) -> dict:
    values = event.model_dump()
    # Store UTC in SQLite, whose datetime columns do not retain offsets.
    values['start'] = normalized_utc(event.start).replace(tzinfo=None)
    values['end'] = normalized_utc(event.end).replace(tzinfo=None)
    return values


# ============================================================
# HOME AND HEALTH CHECK
# ============================================================

@app.get("/")
def home():
    return {
        "application": "StudySync",
        "message": "StudySync backend is running!",
        "version": "1.0.0",
        "documentation": "/docs",
    }


@app.get("/api/health")
def health_check(session: Session = Depends(get_session)):
    return {
        "status": "healthy",
        "service": "StudySync API",
        "total_events": len(session.exec(select(EventRecord)).all()),
    }


# ============================================================
# GET ALL EVENTS WITH FILTERING
# ============================================================

@app.get("/api/events")
def get_events(
    category: Optional[Category] = None,
    priority: Optional[Priority] = None,
    status_filter: Optional[EventStatus] = Query(
        default=None,
        alias="status",
    ),
    completed: Optional[bool] = None,
    search: Optional[str] = None,
    session: Session = Depends(get_session),
):
    result = session.exec(select(EventRecord)).all()

    if category is not None:
        result = [
            event for event in result
            if event.category == category
        ]

    if priority is not None:
        result = [
            event for event in result
            if event.priority == priority
        ]

    if status_filter is not None:
        result = [
            event for event in result
            if event.status == status_filter
        ]

    if completed is not None:
        result = [
            event for event in result
            if event.completed == completed
        ]

    if search:
        keyword = search.lower()

        result = [
            event for event in result
            if (
                keyword in event.title.lower()
                or keyword in event.description.lower()
                or keyword in (event.course or "").lower()
            )
        ]

    result.sort(key=lambda event: normalized_utc(event.start))

    return {
        "total": len(result),
        "events": result,
    }


# ============================================================
# UPCOMING EVENTS
# ============================================================

@app.get("/api/events/upcoming")
def get_upcoming_events(
    days: int = Query(default=7, ge=1, le=365),
    session: Session = Depends(get_session),
):
    now = datetime.now(timezone.utc)
    cutoff = now + timedelta(days=days)

    upcoming = [
        event
        for event in session.exec(select(EventRecord)).all()
        if (
            now <= normalized_utc(event.start) <= cutoff
            and not event.completed
            and event.status != EventStatus.cancelled
        )
    ]

    upcoming.sort(
        key=lambda event: normalized_utc(event.start)
    )

    return {
        "days": days,
        "total": len(upcoming),
        "events": upcoming,
    }


# ============================================================
# SCHEDULING CONFLICT DETECTION
# ============================================================

@app.get("/api/events/conflicts")
def get_event_conflicts(session: Session = Depends(get_session)):
    event_list = [
        event
        for event in session.exec(select(EventRecord)).all()
        if event.status != EventStatus.cancelled
    ]

    conflicts = []

    for i in range(len(event_list)):
        for j in range(i + 1, len(event_list)):
            first = event_list[i]
            second = event_list[j]

            if event_overlaps(first, second):
                conflicts.append({
                    "first_event": first,
                    "second_event": second,
                    "message": (
                        f"'{first.title}' overlaps "
                        f"with '{second.title}'."
                    ),
                })

    return {
        "total_conflicts": len(conflicts),
        "conflicts": conflicts,
    }


# ============================================================
# STUDY TIME STATISTICS
# ============================================================

@app.get("/api/stats/study-time")
def get_study_time(
    days: int = Query(default=7, ge=1, le=365),
    session: Session = Depends(get_session),
):
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(days=days)

    study_events = [
        event
        for event in session.exec(select(EventRecord)).all()
        if (
            event.category == Category.study
            and event.status != EventStatus.cancelled
            and normalized_utc(event.end) >= window_start
            and normalized_utc(event.start) <= now
        )
    ]

    total_hours = 0.0
    completed_hours = 0.0
    by_course = {}

    for event in study_events:
        # Count only the portion within the requested window.
        start = max(normalized_utc(event.start), window_start)
        end = min(normalized_utc(event.end), now)

        hours = max(
            0.0,
            (end - start).total_seconds() / 3600,
        )

        total_hours += hours

        if event.completed:
            completed_hours += hours

        course_name = event.course or "Unassigned"

        by_course[course_name] = (
            by_course.get(course_name, 0.0) + hours
        )

    return {
        "period_days": days,
        "study_sessions": len(study_events),
        "scheduled_study_hours": round(total_hours, 2),
        "completed_study_hours": round(completed_hours, 2),
        "hours_by_course": {
            course: round(hours, 2)
            for course, hours in by_course.items()
        },
    }


# ============================================================
# GENERAL CALENDAR STATISTICS
# ============================================================

@app.get("/api/stats/overview")
def get_statistics(session: Session = Depends(get_session)):
    event_list = session.exec(select(EventRecord)).all()

    by_category = {
        category.value: sum(
            event.category == category
            for event in event_list
        )
        for category in Category
    }

    by_priority = {
        priority.value: sum(
            event.priority == priority
            for event in event_list
        )
        for priority in Priority
    }

    completed_events = sum(
        event.completed for event in event_list
    )

    total_events = len(event_list)

    completion_rate = (
        completed_events / total_events * 100
        if total_events > 0
        else 0
    )

    return {
        "total_events": total_events,
        "completed_events": completed_events,
        "pending_events": total_events - completed_events,
        "completion_rate": round(completion_rate, 2),
        "events_by_category": by_category,
        "events_by_priority": by_priority,
    }


# ============================================================
# GET A SINGLE EVENT
# ============================================================

@app.get("/api/events/{event_id}", response_model=Event)
def get_event(event_id: str, session: Session = Depends(get_session)):
    return get_event_or_404(event_id, session)


# ============================================================
# CREATE A NEW EVENT
# ============================================================

@app.post(
    "/api/events",
    response_model=Event,
    status_code=status.HTTP_201_CREATED,
)

def create_event(
    event_data: EventInput,
    session: Session = Depends(get_session),
):
    validate_event_times(event_data.start, event_data.end)

    new_event = EventRecord(**database_values(event_data))

    session.add(new_event)
    session.commit()
    session.refresh(new_event)

    return new_event


# ============================================================
# UPDATE AN EXISTING EVENT
# ============================================================

@app.put("/api/events/{event_id}", response_model=Event)
def update_event(
    event_id: str,
    event_data: EventInput,
    session: Session = Depends(get_session),
):
    updated_event = get_event_or_404(event_id, session)

    validate_event_times(
        event_data.start,
        event_data.end,
    )

    for field, value in database_values(event_data).items():
        setattr(updated_event, field, value)
    session.add(updated_event)
    session.commit()
    session.refresh(updated_event)

    return updated_event


# ============================================================
# PARTIALLY UPDATE AN EVENT
# ============================================================

@app.patch("/api/events/{event_id}", response_model=Event)
def patch_event(
    event_id: str,
    event_data: EventUpdate,
    session: Session = Depends(get_session),
):
    existing = get_event_or_404(event_id, session)

    changes = event_data.model_dump(
        exclude_unset=True
    )

    updated_data = existing.model_dump()
    updated_data.update(changes)

    try:
        updated_event = Event(**updated_data)
    except ValidationError:
        raise HTTPException(status_code=422, detail="Invalid event fields.")

    validate_event_times(
        updated_event.start,
        updated_event.end,
    )

    for field, value in database_values(updated_event).items():
        if field != 'id':
            setattr(existing, field, value)
    session.add(existing)
    session.commit()
    session.refresh(existing)
    return existing


# ============================================================
# MARK EVENT AS COMPLETED
# ============================================================

@app.patch(
    "/api/events/{event_id}/complete",
    response_model=Event,
)
def complete_event(event_id: str, session: Session = Depends(get_session)):
    event = get_event_or_404(event_id, session)

    event.completed = True
    event.status = EventStatus.completed

    session.add(event)
    session.commit()
    session.refresh(event)

    return event


# ============================================================
# DELETE AN EVENT
# ============================================================

@app.delete("/api/events/{event_id}")
def delete_event(event_id: str, session: Session = Depends(get_session)):
    event = get_event_or_404(event_id, session)
    session.delete(event)
    session.commit()

    return {
        "message": "Event deleted successfully.",
        "id": event_id,
    }
