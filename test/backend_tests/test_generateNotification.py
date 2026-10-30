import unittest

def generateNotification(event_title, time_until_minutes, recipient_role):
    """
    Generates a notification message for a calendar event based on time remaining and recipient role.
    """
    if not isinstance(event_title, str) or not event_title.strip():
        raise ValueError("Event title must be a non-empty string.")
    if not isinstance(time_until_minutes, (int, float)) or time_until_minutes < 0:
        raise ValueError("Time until minutes must be a non-negative number.")
    if recipient_role not in ["student", "parent", "instructor"]:
        raise ValueError("Invalid recipient role specified.")

    if time_until_minutes == 0:
        urgency = "is starting NOW"
    elif time_until_minutes <= 15:
        urgency = f"is starting in {int(time_until_minutes)} minutes"
    else:
        urgency = f"is coming up in {int(time_until_minutes)} minutes"

    prefix = "Reminder:" if recipient_role == "student" else "Notice:"
    return f"{prefix} Event '{event_title.strip()}' {urgency} for {recipient_role}."


class TestNotificationFeature(unittest.TestCase):

    def test_student_notification_positive(self):
        """Test standard notification generation for a student role."""
        result = generateNotification("Data Structures Lecture", 15, "student")
        self.assertEqual(result, "Reminder: Event 'Data Structures Lecture' is starting in 15 minutes for student.")

    def test_parent_notification_positive(self):
        """Test standard notification generation for a parent role."""
        result = generateNotification("Semester Progress Review", 45, "parent")
        self.assertEqual(result, "Notice: Event 'Semester Progress Review' is coming up in 45 minutes for parent.")

    def test_edge_case_starting_now(self):
        """Test event starting immediately at 0 minutes."""
        result = generateNotification("CS Lab", 0, "instructor")
        self.assertEqual(result, "Notice: Event 'CS Lab' is starting NOW for instructor.")

    def test_invalid_recipient_role(self):
        """Test exception handling for unauthorized recipient roles."""
        with self.assertRaises(ValueError):
            generateNotification("Team Meeting", 30, "admin")

    def test_empty_event_title(self):
        """Test exception handling for empty or blank event titles."""
        with self.assertRaises(ValueError):
            generateNotification("", 10, "student")

    def test_negative_time_input(self):
        """Test exception handling for negative time values."""
        with self.assertRaises(ValueError):
            generateNotification("Expired Event", -5, "student")


if __name__ == "__main__":
    unittest.main()