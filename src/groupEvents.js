function timeRange(event) {
  const start = new Date(event.start).getTime();
  const end = new Date(event.end).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    throw new RangeError('Schedules must contain valid start and end times.');
  }
  return { start, end };
}

// schedule = { event: { start, end }, users: [{ name, events: [...] }, ...] }
// Existing events represent busy time. Adjacent events do not overlap.
export function compareCalendars(schedule) {
  if (!schedule || !Array.isArray(schedule.users) || schedule.users.length < 2) {
    throw new TypeError('Provide schedules for at least two users.');
  }
  const proposed = timeRange(schedule.event);
  return schedule.users.every((user) => {
    if (!Array.isArray(user.events)) {
      throw new TypeError('Each user must have an events array.');
    }
    return user.events.every((event) => {
      const busy = timeRange(event);
      return !(proposed.start < busy.end && busy.start < proposed.end);
    });
  });
}
