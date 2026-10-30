export const GROUP_STORAGE_KEY = 'studysync-group-scheduling-v1';
export const GROUP_SCHEDULE_CHANGED = 'studysync-group-schedule-changed';

export function loadGroupSchedule() {
  try {
    const saved = JSON.parse(localStorage.getItem(GROUP_STORAGE_KEY));
    if (saved && Array.isArray(saved.participants) && Array.isArray(saved.events) &&
      saved.participants.every((p) => typeof p.id === 'string' && typeof p.name === 'string') &&
      saved.events.every((e) => typeof e.id === 'string' && typeof e.title === 'string' &&
        Array.isArray(e.participantIds) && Number.isFinite(Date.parse(e.start)) &&
        Date.parse(e.end) > Date.parse(e.start))) return saved;
  } catch { /* Invalid or unavailable storage starts a fresh schedule. */ }
  return { participants: [], events: [] };
}

export function localCalendarEvents() {
  const data = loadGroupSchedule();
  return data.events.map((event) => ({
    id: `local-group:${event.id}`,
    title: `${event.participantIds.length >= 2 ? 'Group' : event.busy === false ? 'Free' : 'Busy'}: ${event.title}`,
    start: event.start,
    end: event.end,
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
    extendedProps: {
      localGroupSchedule: true,
      participants: event.participantIds.map((id) => data.participants.find((p) => p.id === id)?.name || 'Unknown'),
    },
  }));
}
