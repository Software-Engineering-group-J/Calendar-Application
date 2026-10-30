
import { useEffect, useState } from 'react';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

import {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  pullCanvas
} from './api.js';

// Convert a FastAPI event into a FullCalendar event.
function toCalendarEvent(event) {
  return {
    id: String(event.id),
    title: event.title,
    start: event.start,
    end: event.end,
    allDay: false,
    extendedProps: {
      description: event.description || '',
    },
  };
}

// Convert a Date into the format used by datetime-local inputs.
function toDateTimeLocal(date) {
  const d = new Date(date);
  const offset = d.getTimezoneOffset() * 60000;

  return new Date(d.getTime() - offset)
    .toISOString()
    .slice(0, 16);
}

const styles = {
  page: {
    maxWidth: '1200px',
    margin: '30px auto',
    padding: '24px',
    fontFamily: 'Arial, sans-serif',
    color: '#1e293b',
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '20px',
    marginBottom: '30px',
  },

  button: {
    background: 'blue',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 20px',
    cursor: 'pointer',
    fontSize: '15px',
  },

  calendarCard: {
    background: 'white',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  },

  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.55)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    padding: '16px',
  },

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

  label: {
    display: 'block',
    marginTop: '16px',
    marginBottom: '6px',
    fontWeight: 'bold',
  },

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


function App() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [showForm, setShowForm] = useState(false); //For add/edit form
  const [editingId, setEditingId] = useState(null);

  const [showCanvasForm, setShowCanvasForm] = useState(false); //For canvas key form
  var canvas_api_key;

  const [form, setForm] = useState({
    title: '',
    description: '',
    start: '',
    end: '',
  });

  // Load events from the Python backend.
  useEffect(() => {
    let active = true;

    async function loadEvents() {
      try {
        const result = await getEvents();

        if (active) {
          const eventList = Array.isArray(result)
            ? result
            : result?.events || [];

          setEvents(eventList.map(toCalendarEvent));
          setError('');
        }
      } catch (err) {
        if (active) {
          setError(
            `Could not connect to FastAPI: ${err.message}`
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadEvents();

    return () => {
      active = false;
    };
  }, []);

  //Try to pull events from the specified Canvas key.
  function canvasPulled(e) {
    event.preventDefault();

    const form = e.target;
    const formData = new FormData(form);

    canvas_api_key = formData.get("key");

    console.log(pullCanvas( canvas_api_key ));
    setShowCanvasForm(false);
  }

  //Main widget for Canvas API key
  function CanvasKeyPopup() {
    return (
    <div>
    <form onSubmit={canvasPulled} >
    <h2 htmlFor="keybar">API Key</h2>
    <input id = "keybar" name = "key"/>

    <button type = "submit"> Pull </button>
    <button type = "button" onClick={ ()=>setShowCanvasForm(false) } > Cancel </button>

    </form> </div>);
  }


  // Open the Add Event popup.
  function openAddForm(date = new Date()) {
    const start = new Date(date);
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

  // Open the Edit Event popup.
  function openEditForm(info) {
    const event = info.event;

    const start = event.start || new Date();
    const end =
      event.end ||
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

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
  }

  function updateField(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  // Save new or edited events through FastAPI.
  async function handleSubmit(e) {
    e.preventDefault();

    if (saving) return;

    if (!form.title.trim()) {
      alert('Please enter an event title.');
      return;
    }

    const start = new Date(form.start);
    const end = new Date(form.end);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end <= start
    ) {
      alert('The end date must be after the start date.');
      return;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      start: start.toISOString(),
      end: end.toISOString(),
    };

    setSaving(true);
    setError('');

    try {
      const saved = editingId
        ? await updateEvent(editingId, payload)
        : await createEvent(payload);

      const calendarEvent = toCalendarEvent(saved);

      setEvents((previous) =>
        editingId
          ? previous.map((event) =>
              event.id === editingId
                ? calendarEvent
                : event
            )
          : [...previous, calendarEvent]
      );

      closeForm();
    } catch (err) {
      setError(`Could not save event: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  // Delete an event through FastAPI.
  async function handleDelete() {
    if (!editingId || saving) return;

    const confirmed = window.confirm(
      'Are you sure you want to delete this event?'
    );

    if (!confirmed) return;

    setSaving(true);
    setError('');

    try {
      await deleteEvent(editingId);

      setEvents((previous) =>
        previous.filter(
          (event) => event.id !== editingId
        )
      );

      closeForm();
    } catch (err) {
      setError(`Could not delete event: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  function handleDateClick(info) {
    openAddForm(info.date);
  }

  return (
    <main style={styles.page}>
      {/* HEADER */}
      <header style={styles.header}>
        <div>
          <h1>📅 StudySync</h1>
          <p>Team Calendar & Event Management</p>
        </div>

        <button type = "button" style = {styles.button} onClick={ ()=> setShowCanvasForm(true) } >Import Canvas</button>

        <button
          type="button"
          style={styles.button}
          onClick={() => openAddForm()}
        >
          + Add Event
        </button>
      </header>

      {/* Canvas form entry*/}
      {showCanvasForm && CanvasKeyPopup()}

      {/* CALENDAR */}
      <section style={styles.calendarCard}>
        <h2>Team Schedule</h2>

        <p>
          Click a date to create an event.
          Click an existing event to edit it.
        </p>

        {loading && (
          <p role="status">
            Loading events from Python...
          </p>
        )}

        {error && (
          <p role="alert" style={{ color: '#dc2626' }}>
            {error}
          </p>
        )}

        <FullCalendar
          plugins={[
            dayGridPlugin,
            timeGridPlugin,
            interactionPlugin,
          ]}
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


      {/* ADD / EDIT EVENT MODAL */}
      {showForm && (
        <div
          style={styles.overlay}
          onClick={closeForm}
        >
          <div
            style={styles.modal}
            onClick={(e) => e.stopPropagation()}
          >
            <h2>
              {editingId
                ? 'Edit Event'
                : 'Add New Event'}
            </h2>

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
                  disabled={saving}
                  style={styles.button}
                >
                  {saving
                    ? 'Saving...'
                    : editingId
                    ? 'Save Changes'
                    : 'Create Event'}
                </button>

                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  style={{
                    ...styles.button,
                    background: '#64748b',
                  }}
                >
                  Cancel
                </button>

                {editingId && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={saving}
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

export default App;





