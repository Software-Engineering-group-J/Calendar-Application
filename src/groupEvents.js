function timeRange(event) {
  const start = new Date(event.start).getTime();
  const end = new Date(event.end).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    throw new RangeError('Schedules must contain valid start and end times.');
  }
  return { start, end };
}

// schedule = { event: { start, end }, users: [{ name, events: [...] }, ...] }
// Missing availability defaults to busy for previously saved events.
export function isCalendarAvailable(event, events) {
  const proposed = timeRange(event);
  return events.every((existing) => {
    const busy = timeRange(existing);
    return event.busy === false || existing.busy === false ||
      !(proposed.start < busy.end && busy.start < proposed.end);
  });
}

// Adjacent events do not overlap. Free events do not block availability.
export function compareCalendars(schedule) {
  if (!schedule || !Array.isArray(schedule.users) || schedule.users.length < 2) {
    throw new TypeError('Provide schedules for at least two users.');
  }
  timeRange(schedule.event);
  return schedule.users.every((user) => {
    if (!Array.isArray(user.events)) {
      throw new TypeError('Each user must have an events array.');
    }
    return isCalendarAvailable(schedule.event, user.events);
  });
}
