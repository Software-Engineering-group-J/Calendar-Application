import { useState } from 'react';
import { compareCalendars, isCalendarAvailable } from './groupEvents.js';
import './GroupScheduler.css';
import { GROUP_STORAGE_KEY, GROUP_SCHEDULE_CHANGED, loadGroupSchedule } from './groupStorage.js';

const STORAGE_KEY = GROUP_STORAGE_KEY;

const loadSchedule = loadGroupSchedule;

function blankForm() {
  return { title: '', start: '', end: '', participantIds: [], busy: true };
}

function timeLabel(event) {
  return `${new Date(event.start).toLocaleString()} – ${new Date(event.end).toLocaleString()}`;
}

export default function GroupScheduler() {
  const [data, setData] = useState(loadSchedule);
  const [name, setName] = useState('');
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function persist(updated) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setData(updated);
      window.dispatchEvent(new Event(GROUP_SCHEDULE_CHANGED));
      setError('');
      return true;
    } catch {
      setError('Could not save in this browser. Check available storage and browser permissions.');
      return false;
    }
  }

  function addParticipant(e) {
    e.preventDefault();
    setMessage('');
    const trimmed = name.trim();
    if (!trimmed) { setError('Enter a participant name.'); return; }
    if (data.participants.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
      setError('That participant name already exists. Use a distinct name.');
      return;
    }
    if (persist({ ...data, participants: [...data.participants, { id: crypto.randomUUID(), name: trimmed }] })) {
      setName('');
      setMessage(`${trimmed} added.`);
    }
  }

  function toggleParticipant(id) {
    setMessage('');
    setForm((previous) => ({ ...previous, participantIds: previous.participantIds.includes(id)
      ? previous.participantIds.filter((value) => value !== id) : [...previous.participantIds, id] }));
  }

  function resetForm() {
    setForm(blankForm());
    setEditingId(null);
  }

  function saveEvent(e) {
    e.preventDefault();
    setMessage('');
    setError('');
    if (!form.title.trim() || !form.participantIds.length) {
      setError('Enter a title and select at least one participant.'); return;
    }
    const start = new Date(form.start);
    const end = new Date(form.end);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
      setError('Choose valid times with the end after the start.'); return;
    }
    const candidate = { id: editingId || crypto.randomUUID(), title: form.title.trim(),
      start: start.toISOString(), end: end.toISOString(), participantIds: form.participantIds, busy: form.busy };
    const users = data.participants.filter((p) => form.participantIds.includes(p.id)).map((p) => ({
      ...p, events: data.events.filter((event) => event.id !== editingId && event.participantIds.includes(p.id)),
    }));
    const compatible = users.length >= 2
      ? compareCalendars({ event: candidate, users })
      : isCalendarAvailable(candidate, users[0].events);
    if (!compatible) {
      const conflicts = users.filter((user) => !isCalendarAvailable(candidate, user.events));
      setError(`Time conflict for: ${conflicts.map((p) => p.name).join(', ')}. Choose another time.`);
      return;
    }
    if (persist({ ...data, events: editingId
      ? data.events.map((event) => event.id === editingId ? candidate : event)
      : [...data.events, candidate] })) {
      resetForm();
      setMessage(!candidate.busy ? 'Free event saved. This event does not block availability.'
        : users.length >= 2 ? 'Group event saved. All selected participants are available.' : 'Busy event saved.');
    }
  }

  function editEvent(event) {
    const localTime = (value) => {
      const date = new Date(value);
      return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    };
    setEditingId(event.id);
    setForm({ ...event, busy: event.busy !== false, start: localTime(event.start), end: localTime(event.end) });
    setMessage('');
    setError('');
  }

  function removeParticipant(participant) {
    if (data.events.some((event) => event.participantIds.includes(participant.id))) {
      setError('Remove this participant from their events before removing them.'); return;
    }
    if (persist({ ...data, participants: data.participants.filter((p) => p.id !== participant.id) })) {
      setForm((previous) => ({ ...previous, participantIds: previous.participantIds.filter((id) => id !== participant.id) }));
      setMessage(`${participant.name} removed.`);
    }
  }

  return (
    <section className="group-scheduler" aria-labelledby="group-heading">
      <h2 id="group-heading">Group scheduling</h2>
      <p>Manage participant schedules here, then find a time everyone can attend.</p>
      <p className="group-notice">Browser-local prototype: schedules stay in this browser. No accounts or shared API are used here. All times are shown in your local timezone.</p>
      {error && <p role="alert" className="group-error">{error}</p>}
      {message && <p role="status" className="group-success">{message}</p>}
      <div className="group-columns">
        <div>
          <h3>1. Participants</h3>
          <form onSubmit={addParticipant}>
            <label htmlFor="participant-name">Participant name</label>
            <input id="participant-name" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} required />
            <button type="submit">Add participant</button>
          </form>
          <ul>{data.participants.map((p) => <li key={p.id}>{p.name}{' '}
            <button type="button" className="group-secondary" onClick={() => removeParticipant(p)} aria-label={`Remove participant ${p.name}`}>Remove</button>
          </li>)}</ul>
          {!data.participants.length && <p>Add at least two participants to schedule a group event.</p>}
        </div>
        <div>
          <h3>2. {editingId ? 'Edit event' : 'Schedule an event'}</h3>
          <p>Select one participant for a personal event or two or more for a group event. Choose whether it blocks their availability.</p>
          <form onSubmit={saveEvent}>
            <label htmlFor="group-title">Event title</label>
            <input id="group-title" value={form.title} maxLength={200} required onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <label htmlFor="group-start">Start time</label>
            <input id="group-start" type="datetime-local" value={form.start} required onChange={(e) => setForm({ ...form, start: e.target.value })} />
            <label htmlFor="group-end">End time</label>
            <input id="group-end" type="datetime-local" value={form.end} required onChange={(e) => setForm({ ...form, end: e.target.value })} />
            <label htmlFor="event-availability">Show as</label>
            <select id="event-availability" value={form.busy ? 'busy' : 'free'} onChange={(e) => setForm({ ...form, busy: e.target.value === 'busy' })}>
              <option value="busy">Busy — block availability</option>
              <option value="free">Free — allow overlapping events</option>
            </select>
            <p>This setting applies to every selected participant for the entire time range. Use a separate shorter busy event if only part of the time is unavailable.</p>
            <fieldset><legend>Participants for this event</legend>
              {data.participants.map((p) => <label className="group-checkbox" key={p.id}>
                <input type="checkbox" checked={form.participantIds.includes(p.id)} onChange={() => toggleParticipant(p.id)} />{p.name}
              </label>)}
              {!data.participants.length && <p>Add participants first.</p>}
            </fieldset>
            <button type="submit" disabled={!data.participants.length}>{form.participantIds.length >= 2 ? 'Save group event' : form.busy ? 'Save busy event' : 'Save free event'}</button>
            {editingId && <button type="button" className="group-secondary" onClick={resetForm}>Cancel edit</button>}
          </form>
        </div>
      </div>
      <h3>3. Saved schedule</h3>
      {!data.events.length && <p>No local events yet. Add busy times before proposing a group event.</p>}
      <ul className="group-event-list">{[...data.events].sort((a, b) => Date.parse(a.start) - Date.parse(b.start)).map((event) => (
        <li key={event.id}>
          <strong>{event.title}</strong> <span>({event.participantIds.length >= 2 ? 'Group event' : 'Personal event'} · {event.busy === false ? 'Free' : 'Busy'})</span>
          <div>{timeLabel(event)}</div>
          <div>Participants: {event.participantIds.map((id) => data.participants.find((p) => p.id === id)?.name || 'Unknown').join(', ')}</div>
          <button type="button" className="group-secondary" onClick={() => editEvent(event)} aria-label={`Edit ${event.title}`}>Edit</button>
          <button type="button" className="group-secondary" aria-label={`Delete ${event.title}`} onClick={() => {
            if (persist({ ...data, events: data.events.filter((item) => item.id !== event.id) })) {
              if (editingId === event.id) resetForm();
              setMessage('Event deleted.');
            }
          }}>Delete</button>
        </li>
      ))}</ul>
    </section>
  );
}
