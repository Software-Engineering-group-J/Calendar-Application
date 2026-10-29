// Helper function representing the notification logic
import { describe, expect, test } from 'vitest';

function generateNotification(eventTitle, timeUntilMinutes, recipientRole) {
    if (!typeof eventTitle === 'string' || !eventTitle.trim()) {
        throw new Error("Event title must be a non-empty string.");
    }
    if (typeof timeUntilMinutes !== 'number' || timeUntilMinutes < 0) {
        throw new Error("Time until minutes must be a non-negative number.");
    }
    if (!["student", "parent", "instructor"].includes(recipientRole)) {
        throw new Error("Invalid recipient role specified.");
    }

    let urgency = "";
    if (timeUntilMinutes === 0) {
        urgency = "is starting NOW";
    } else if (timeUntilMinutes <= 15) {
        urgency = `is starting in ${Math.floor(timeUntilMinutes)} minutes`;
    } else {
        urgency = `is coming up in ${Math.floor(timeUntilMinutes)} minutes`;
    }

    const prefix = recipientRole === "student" ? "Reminder:" : "Notice:";
    return `${prefix} Event '${eventTitle.trim()}' ${urgency} for ${recipientRole}.`;
}

describe("Notification Feature Unit Tests", () => {
    test("generates standard student notification", () => {
        const result = generateNotification("Data Structures Lecture", 15, "student");
        expect(result).toBe("Reminder: Event 'Data Structures Lecture' is starting in 15 minutes for student.");
    });

    test("generates parent notification for upcoming event", () => {
        const result = generateNotification("Semester Review", 30, "parent");
        expect(result).toBe("Notice: Event 'Semester Review' is coming up in 30 minutes for parent.");
    });

    test("handles edge case when event is starting NOW (0 minutes)", () => {
        const result = generateNotification("CS Lab", 0, "instructor");
        expect(result).toBe("Notice: Event 'CS Lab' is starting NOW for instructor.");
    });

    test("throws error for invalid recipient role", () => {
        expect(() => generateNotification("Meeting", 10, "admin")).toThrow("Invalid recipient role specified.");
    });

    test("throws error for empty event title", () => {
        expect(() => generateNotification("", 10, "student")).toThrow("Event title must be a non-empty string.");
    });
});
