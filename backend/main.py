from __future__ import annotations

from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Dict, List, Optional
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from canvasapi.assignment import Assignment
from canvasapi.calendar_event import CalendarEvent
from canvasapi.quiz import Quiz
from canvasapi.new_quiz import NewQuiz

# ============================================================
# STUDYSYNC API CONFIGURATION
# ============================================================

app = FastAPI(
    title="StudySync API",
    description=(
        "Backend API for the StudySync academic planner. "
        "Manage calendar events, priorities, categories, "
        "study sessions, and scheduling conflicts."
    ),
    version="1.0.0",
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
# TEMPORARY EVENT STORAGE
# ============================================================

# Events are stored in memory for now.
# Restarting the server clears this dictionary.
# SQLite or PostgreSQL can replace this later.

events: Dict[str, Event] = {}


# ============================================================
# TIMEOPS HELPER FUNCTIONS
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
    try:
        return (
            first.start < second.end
            and second.start < first.end
        )
    except TypeError:
        return False


def get_event_or_404(event_id: str) -> Event:
    event = events.get(event_id)

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

# ============================================================
# CANVAS HELPER METHODS
# ============================================================

def calendar_event_to_event_input( canvas_event: CalendarEvent ) -> EventInput:
    '''Converts Canvas calendar events to the EventInput data model.
    Sensible defaults for event status, priority, and category are set and labelled (since there is no true analog for them.)
    NOTE: This method makes no effort to handle events that exist in the past.'''
    workflow_state = getattr(
        canvas_event,
        "workflow_state",
        "deleted"
    )

    match workflow_state: #Workflow_state exists, else getattr would have raised an error
        case "active":
            event_status = EventStatus.pending
        case "locked": #Assume that locked = event date has passed
            event_status = EventStatus.completed
        case _:
            event_status = EventStatus.cancelled

    return EventInput(
        title=canvas_event.title,
        description=getattr(
            canvas_event,
            "description",
            "",
        ) or "No description provided.",
        start=canvas_event.start_at_date, #start_at is string format, canvasapi stores datetime as start_at_date
        end=canvas_event.end_at_date,
        priority=Priority.medium, #Default
        category=Category.other, #Default
        status=event_status,
        location=getattr(
            canvas_event,
            "location_name",
            None,
        ),
        course=getattr(
            canvas_event,
            "context_name",
            None,
        ),
        completed = (workflow_state == locked), #This is the same assumption we made above
    )

def assignment_to_event_input(assignment: Assignment) -> EventInput:
    start = (
        getattr(assignment, "unlock_at_date", None)
        or getattr(assignment, "due_at_date", None)
        or getattr(assignment, "lock_at_date", None)
    )

    if start is None:
        raise ValueError(
            "Assignment cannot be converted because it has no unlock_at, "
            "due_at, or lock_at value."
        )

    end = (
        getattr(assignment, "due_at_date", None)
        or getattr(assignment, "lock_at_date", None)
        or start
    )

    if end is start: #validate_event_times says that having these equal is invalid, so separate by one second when applicable
        end = start + timedelta(seconds = 1)

    course_id = getattr(assignment, "course_id", None)

    return EventInput(
        title=assignment.name,
        description=getattr(assignment, "description", "") or "",
        start=start,
        end=end,
        priority=Priority.medium, #default
        category=Category.assignment, #default
        status=EventStatus.pending, #default
        location=None, #default
        course=str(course_id) if course_id is not None else None,
        completed=False,
    )


def quiz_to_event_input(quiz: Quiz | NewQuiz) -> EventInput:
    '''NOTE: Quiz and NewQuiz are separate classes, but we handle both here.
    We do not care about their functionalities beyond what timedates they take place.'''
    start = (
        getattr(quiz, "unlock_at_date", None)
        or getattr(quiz, "due_at_date", None)
        or getattr(quiz, "lock_at_date", None)
    )

    if start is None:
        raise ValueError(
            "Quiz cannot be converted because it has no unlock_at, "
            "due_at, or lock_at value."
    )

    end = (
        getattr(quiz, "due_at_date", None)
        or getattr(quiz, "lock_at_date", None)
        or start
    )

    if end is start: #ditto to assignment converter above
        end = start + timedelta(seconds = 1)

    course_id = getattr(quiz, "course_id", None)

    event_description = ""
    if type(quiz) == NewQuiz:
        event_description = getattr(quiz, "instructions", "") or ""
    else:
        description = getattr(quiz, "description", "") or ""

    return EventInput(
        title=quiz.title,
        description=event_description,
        start=start,
        end=end,
        priority=Priority.high, #default
        category=Category.exam, #default
        status=EventStatus.pending, #default
        location=None, #default
        course=str(course_id) if course_id is not None else None,
        completed=False, #default
    )


# def new_quiz_to_event_input(new_quiz: NewQuiz) -> EventInput:
#     start = (
#         getattr(new_quiz, "unlock_at_date", None)
#         or getattr(new_quiz, "due_at_date", None)
#         or getattr(new_quiz, "lock_at_date", None)
#     )
#     end = (
#         getattr(new_quiz, "due_at_date", None)
#         or getattr(new_quiz, "lock_at_date", None)
#         or start
#     )
#
#     if start is None:
#         raise ValueError(
#             "NewQuiz cannot be converted because it has no unlock_at, "
#             "due_at, or lock_at value."
#         )
#
#     course_id = getattr(new_quiz, "course_id", None)
#
#     return EventInput(
#         title=new_quiz.title,
#         description=getattr(new_quiz, "instructions", "") or "",
#         start=start,
#         end=end,
#         priority=Priority.high, #default
#         category=Category.exam, #default
#         status=EventStatus.pending, #default
#         location=None, #default
#         course=str(course_id) if course_id is not None else None,
#         completed=False, #default
#     )


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
def health_check():
    return {
        "status": "healthy",
        "service": "StudySync API",
        "total_events": len(events),
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
):
    result = list(events.values())

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
):
    now = datetime.now(timezone.utc)
    cutoff = now + timedelta(days=days)

    upcoming = [
        event
        for event in events.values()
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
def get_event_conflicts():
    event_list = [
        event
        for event in events.values()
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
):
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(days=days)

    study_events = [
        event
        for event in events.values()
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
def get_statistics():
    event_list = list(events.values())

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
def get_event(event_id: str):
    return get_event_or_404(event_id)


# ============================================================
# CREATE A NEW EVENT
# ============================================================

@app.post(
    "/api/events",
    response_model=Event,
    status_code=status.HTTP_201_CREATED,
)
def create_event(event_data: EventInput):
    validate_event_times(
        event_data.start,
        event_data.end,
    )

    event_id = str(uuid4())

    new_event = Event(
        id=event_id,
        **event_data.model_dump(),
    )

    events[event_id] = new_event

    return new_event


# ============================================================
# UPDATE AN EXISTING EVENT
# ============================================================

@app.put("/api/events/{event_id}", response_model=Event)
def update_event(
    event_id: str,
    event_data: EventInput,
):
    get_event_or_404(event_id)

    validate_event_times(
        event_data.start,
        event_data.end,
    )

    updated_event = Event(
        id=event_id,
        **event_data.model_dump(),
    )

    events[event_id] = updated_event

    return updated_event


# ============================================================
# PARTIALLY UPDATE AN EVENT
# ============================================================

@app.patch("/api/events/{event_id}", response_model=Event)
def patch_event(
    event_id: str,
    event_data: EventUpdate,
):
    existing = get_event_or_404(event_id)

    changes = event_data.model_dump(
        exclude_unset=True
    )

    updated_data = existing.model_dump()
    updated_data.update(changes)

    updated_event = Event(**updated_data)

    validate_event_times(
        updated_event.start,
        updated_event.end,
    )

    events[event_id] = updated_event

    return updated_event


# ============================================================
# MARK EVENT AS COMPLETED
# ============================================================

@app.patch(
    "/api/events/{event_id}/complete",
    response_model=Event,
)
def complete_event(event_id: str):
    event = get_event_or_404(event_id)

    event.completed = True
    event.status = EventStatus.completed

    events[event_id] = event

    return event


# ============================================================
# DELETE AN EVENT
# ============================================================

@app.delete("/api/events/{event_id}")
def delete_event(event_id: str):
    get_event_or_404(event_id)

    del events[event_id]

    return {
        "message": "Event deleted successfully.",
        "id": event_id,
    }

# Canvas module assumptions:
# The backend has full control over OAuth2 keys
# We should avoid storing keys in memory, even if the backend is shielded from the internet

