import unittest
from datetime import datetime, timezone

from backend.main import Event, event_overlaps


def make_event(start: str, end: str) -> Event:
    return Event(
        id="test-event",
        title="Schedule item",
        start=datetime.fromisoformat(start).replace(tzinfo=timezone.utc),
        end=datetime.fromisoformat(end).replace(tzinfo=timezone.utc),
    )


class CompareCalendarsScheduleTests(unittest.TestCase):
    def setUp(self):
        self.proposed = make_event("2026-11-02T14:00:00", "2026-11-02T15:00:00")

    def test_proposed_event_does_not_overlap_when_participant_is_free(self):
        participant_schedule = [
            make_event("2026-11-02T12:00:00", "2026-11-02T13:00:00"),
            make_event("2026-11-02T15:00:00", "2026-11-02T16:00:00"),
        ]
        has_conflict = any(event_overlaps(self.proposed, event) for event in participant_schedule)
        self.assertFalse(has_conflict)

    def test_proposed_event_conflicts_if_any_participant_schedule_overlaps(self):
        participant_schedules = [
            [make_event("2026-11-02T10:00:00", "2026-11-02T11:00:00")],
            [make_event("2026-11-02T14:30:00", "2026-11-02T15:30:00")],
        ]
        has_conflict = any(
            event_overlaps(self.proposed, event)
            for schedule in participant_schedules
            for event in schedule
        )
        self.assertTrue(has_conflict)

    def test_overlapping_event_in_a_later_participant_schedule_is_detected(self):
        participant_schedules = [
            [],
            [],
            [make_event("2026-11-02T13:30:00", "2026-11-02T14:30:00")],
        ]
        has_conflict = any(
            event_overlaps(self.proposed, event)
            for schedule in participant_schedules
            for event in schedule
        )
        self.assertTrue(has_conflict)

    def test_adjacent_events_are_not_conflicts(self):
        ends_when_proposed_starts = make_event("2026-11-02T13:00:00", "2026-11-02T14:00:00")
        starts_when_proposed_ends = make_event("2026-11-02T15:00:00", "2026-11-02T16:00:00")
        self.assertFalse(event_overlaps(self.proposed, ends_when_proposed_starts))
        self.assertFalse(event_overlaps(self.proposed, starts_when_proposed_ends))


if __name__ == "__main__":
    unittest.main()
