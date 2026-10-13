// React state lets the page remember events and form inputs while it is open.
import { useEffect, useState } from 'react';
// Main calendar component. The imports below enable different views and clicks.
import FullCalendar from '@fullcalendar/react';
// Month grid view (dayGridMonth).
import dayGridPlugin from '@fullcalendar/react/daygrid';
// Week and day views with hourly time slots.
import timeGridPlugin from '@fullcalendar/react/timegrid';
// Enables calendar date-click interactions.
import interactionPlugin from '@fullcalendar/react/interaction';
// Theme plugin used by this FullCalendar setup.
import classicThemePlugin from '@fullcalendar/react/themes/classic';
// Calendar CSS: structure, theme, and colors.
import '@fullcalendar/react/skeleton.css';
import '@fullcalendar/react/themes/classic/theme.css';
import '@fullcalendar/react/themes/classic/palette.css';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);

  if (!response.ok) {
    let message = `API request failed (${response.status}).`;
    try {
      const body = await response.json();
      if (typeof body.detail === 'string') message = body.detail;
    } catch {
      // Keep the status-based message when the response has no JSON body.
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}

function toCalendarEvent(event) {
  return {
    ...event,
    extendedProps: {
      ...(event.extendedProps || {}),
      description: event.description || event.extendedProps?.description || '',
    },
  };
}
// EDIT HERE: All visual styling for the page and event popup.
// Values such as padding, colors, and widths change appearance, not event logic.
const styles = {
  // Overall page width, margins, padding, and font.
  page: {
    maxWidth: '1200px',
    margin: '30px auto',
    padding: '24px',
    fontFamily: 'Arial, sans-serif',
  },
  // Places the app title and Add Event button across the top.
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '20px',
    marginBottom: '30px',
  },
  // Default blue button style (also reused for Save Changes).
  button: {
    background: 'red',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 20px',
    cursor: 'pointer',
    fontSize: '15px',
  },
  // Dark background behind the popup; zIndex keeps it above the calendar.
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.55)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    padding: '16px',
  },
  // White popup box size, spacing, shadow, and scrolling.
  modal: {
    background: 'white',
    color: '#1e293b',
    borderRadius: '12px',
    padding: '28px',
    width: '100%',
    maxWidth: '460px',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 15px 45px rgba(0,0,0,0.25)',
  },
  // Text labels above form fields.
  label: {
    display: 'block',
    marginTop: '16px',
    marginBottom: '6px',
    fontWeight: 'bold',
  },
  // Shared styles for title, description, and date/time fields.
  input: {
    width: '100%',
    padding: '11px',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    boxSizing: 'border-box',
    fontSize: '14px',
    fontFamily: 'inherit',
  },
};
// Format a local date for datetime-local inputs
// datetime-local inputs need local time formatted as YYYY-MM-DDTHH:mm.
// The timezone offset avoids showing UTC time in a local-time input.
function toDateTimeLocal(date) {
  const d = new Date(date);
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset)
    .toISOString()
    .slice(0, 16);
}
// Main React component: event state, event handlers, calendar, and form UI.
function App() {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [apiError, setApiError] = useState('');
  // true = show popup; false = hide popup.
  const [showForm, setShowForm] = useState(false);
  // null = creating a new event; event ID = editing an existing one.
  const [editingId, setEditingId] = useState(null);
  // Controlled inputs: typing in the popup updates this object.
  const [form, setForm] = useState({
    title: '',
    description: '',
    start: '',
    end: '',
  });
  useEffect(() => {
    let isCurrent = true;

    apiRequest('/api/events')
      .then((result) => {
        if (isCurrent) setEvents(result.events.map(toCalendarEvent));
      })
      .catch((error) => {
        if (isCurrent) setApiError(`Unable to load events: ${error.message}`);
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);
  // ADD EVENT: initialize blank fields and open the popup.
  // If a date is clicked, use that date; otherwise use the current time.
  function openAddForm(date = new Date()) {
    const start = new Date(date);
    // EDIT HERE: 60 * 60 * 1000 = default duration of 1 hour.
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    setEditingId(null);
    setForm({
      title: '',
      description: '',
      start: toDateTimeLocal(start),
      end: toDateTimeLocal(end),
    });
    setShowForm(true);
  }
  // EDIT EVENT: FullCalendar passes the clicked event in info.event.
  // Copy its existing values into the popup fields.
  function openEditForm(info) {
    const event = info.event;
    const start = event.start || new Date();
    const end = event.end ||
      new Date(start.getTime() + 60 * 60 * 1000);
    setEditingId(event.id);
    setForm({
      title: event.title,
      description: event.extendedProps.description || '',
      start: toDateTimeLocal(start),
      end: toDateTimeLocal(end),
    });
    setShowForm(true);
  }
  // CANCEL / CLOSE: hide popup and clear which event is being edited.
  function closeForm() {
    setShowForm(false);
    setEditingId(null);
  }
  // INPUT CHANGE: update just one form field, keeping the others intact.
  // Example: updateField('title', 'Exam') changes only the title.
  function updateField(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }
  // CREATE OR SAVE CHANGES: called when the form's submit button is clicked.
  async function handleSubmit(e) {
    // Prevent browser's normal form submission (which reloads the page).
    e.preventDefault();
    // VALIDATION: event title must not be empty or only spaces.
    if (!form.title.trim()) {
      alert('Please enter an event title.');
      return;
    }
    // Convert the local date/time strings into JavaScript Date objects.
    const start = new Date(form.start);
    const end = new Date(form.end);
    // VALIDATION: dates must be valid and end must be later than start.
    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end <= start
    ) {
      alert('The end date must be after the start date.');
      return;
    }
    const eventData = {
      title: form.title.trim(),
      description: form.description.trim(),
      start: start.toISOString(),
      end: end.toISOString(),
    };

    setIsSaving(true);
    setApiError('');
    try {
      const savedEvent = await apiRequest(
        editingId ? `/api/events/${editingId}` : '/api/events',
        {
          method: editingId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventData),
        },
      );
      const calendarEvent = toCalendarEvent(savedEvent);

      setEvents((current) =>
        editingId
          ? current.map((event) => event.id === editingId ? calendarEvent : event)
          : [...current, calendarEvent]
      );
      closeForm();
    } catch (error) {
      setApiError(`Unable to save event: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  }
  // DELETE EVENT: ask for confirmation, remove the selected ID, save.
  async function handleDelete() {
    if (!editingId) return;
    const confirmed = window.confirm(
      'Are you sure you want to delete this event?'
    );
    if (!confirmed) return;
    setApiError('');
    try {
      await apiRequest(`/api/events/${editingId}`, { method: 'DELETE' });
      setEvents((current) => current.filter((event) => event.id !== editingId));
      closeForm();
    } catch (error) {
      setApiError(`Unable to delete event: ${error.message}`);
    }
  }
  // Clicking a calendar date opens Add Event prefilled with that date.
  function handleDateClick(info) {
    openAddForm(info.date);
  }
  // JSX BELOW: Controls what appears on screen and what clicks trigger.
  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1>📅 StudySync</h1>
          <p>Team Calendar & Event Management</p>
        </div>
        {/* EDIT HERE: top-right Add Event button; onClick opens the form. */}
        <button
          type="button"
          style={styles.button}
          onClick={() => openAddForm()}
        >
          + Add Event
        </button>
      </header>
      {apiError && <p role="alert">{apiError}</p>}
      <section>
        <h2>Team Schedule</h2>
        <p>Click a date to create an event.</p>
        {isLoading && <p role="status">Loading events...</p>}
        {/* EDIT HERE: initialView sets month/week/day; headerToolbar controls navigation.
            events supplies saved items; dateClick adds; eventClick edits. */}
        <FullCalendar
          plugins={[
            dayGridPlugin,
            timeGridPlugin,
            interactionPlugin,
            classicThemePlugin,
          ]}
          themeSystem="standard"
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          events={events}
          dateClick={handleDateClick}
          eventClick={openEditForm}
          height="auto"
        />
      </section>
      {/* Only render the popup while showForm is true. */}
      {showForm && (
        <div
          style={styles.overlay}
          onClick={closeForm}
        >
          {/* stopPropagation prevents clicks inside the popup from closing it. */}
          <div
            style={styles.modal}
            onClick={(e) => e.stopPropagation()}
          >
            <h2>
              {editingId ? 'Edit Event' : 'Add New Event'}
            </h2>
            {/* Submitting this form calls handleSubmit (create or update). */}
            <form onSubmit={handleSubmit}>
              <label style={styles.label}>
                Event Title
              </label>
              <input
                style={styles.input}
                type="text"
                required
                value={form.title}
                onChange={(e) =>
                  updateField('title', e.target.value)
                }
                placeholder="e.g. Software Engineering Meeting"
              />
              <label style={styles.label}>
                Description
              </label>
              <textarea
                style={{
                  ...styles.input,
                  minHeight: '90px',
                  resize: 'vertical',
                }}
                value={form.description}
                onChange={(e) =>
                  updateField('description', e.target.value)
                }
                placeholder="Event details..."
              />
              <label style={styles.label}>
                Start Date & Time
              </label>
              <input
                style={styles.input}
                type="datetime-local"
                required
                value={form.start}
                onChange={(e) =>
                  updateField('start', e.target.value)
                }
              />
              <label style={styles.label}>
                End Date & Time
              </label>
              <input
                style={styles.input}
                type="datetime-local"
                required
                value={form.end}
                onChange={(e) =>
                  updateField('end', e.target.value)
                }
              />
              <div
                style={{
                  display: 'flex',
                  gap: '10px',
                  flexWrap: 'wrap',
                  marginTop: '24px',
                }}
              >
                <button
                  type="submit"
                  style={styles.button}
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Event'}
                </button>
                <button
                  type="button"
                  onClick={closeForm}
                  style={{
                    ...styles.button,
                    background: '#64748b',
                  }}
                >
                  Cancel
                </button>
                {/* Only show Delete when editing an existing event. */}
                {editingId && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    style={{
                      ...styles.button,
                      background: '#dc2626',
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
// Makes App available to main.jsx so React can render it.
export default App;






