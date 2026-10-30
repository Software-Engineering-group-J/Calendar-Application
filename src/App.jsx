
import { useEffect, useState } from 'react';
import GroupScheduler from './GroupScheduler.jsx';
import { localCalendarEvents, GROUP_STORAGE_KEY, GROUP_SCHEDULE_CHANGED } from './groupStorage.js';

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

const COURSE_COLORS = ['#2563eb', '#16a34a', '#9333ea', '#ea580c', '#0891b2', '#db2777', '#ca8a04', '#475569'];
const DEFAULT_EVENT_COLOR = '#64748b';

function suggestedCourseColor(courses) {
  const usedColors = new Set(courses.map((course) => course.color?.toLowerCase()).filter(Boolean));
  return COURSE_COLORS.find((color) => !usedColors.has(color)) || COURSE_COLORS[courses.length % COURSE_COLORS.length];
}

function colorTint(hexColor, alpha = 0.16) {
  const hex = hexColor?.replace('#', '');
  if (!hex || hex.length !== 6) return `rgba(37, 99, 235, ${alpha})`;
  const [red, green, blue] = [0, 2, 4].map((index) => Number.parseInt(hex.slice(index, index + 2), 16));
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function formatCalendarTime(date) {
  if (!date) return '';
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const hour12 = hours % 12 || 12;
  const suffix = hours < 12 ? 'a' : 'p';

  if (hours === 23 && minutes === 59) return '';
  return minutes === 0
    ? `${hour12}${suffix}`
    : `${hour12}:${String(minutes).padStart(2, '0')}${suffix}`;
}

// Convert a FastAPI event into a FullCalendar event.
function toCalendarEvent(event, courses = []) {
  const isDeadlineItem = event.category === 'assignment' || event.category === 'exam';
  const deadline = isDeadlineItem && event.end ? new Date(event.end) : null;
  const course = event.course
    ? courses.find((savedCourse) => savedCourse.title.trim().toLocaleLowerCase() === event.course.trim().toLocaleLowerCase())
    : null;
  const color = event.color || course?.color || DEFAULT_EVENT_COLOR;
  return {
    id: String(event.id),
    title: event.title,
    start: deadline ? deadline.toISOString() : event.start,
    end: deadline ? new Date(deadline.getTime() + 60 * 1000).toISOString() : event.end,
    allDay: event.category === 'course',
    ...(color ? { backgroundColor: colorTint(color), borderColor: color, textColor: color } : {}),
    extendedProps: {
      description: event.description || '',
      category: event.category || 'other',
      priority: event.priority || 'medium',
      course: event.course || '',
      sourceTitle: event.title,
      color,
      deadline: deadline?.toISOString() || '',
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
    fontFamily: 'Arial, sans-serif',                // Change the font style of eveything here!
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
    background: 'red',                // + Add Event box Color location 
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

  courseGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
  },

  courseCard: {
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '16px',
    background: '#f8fafc',
  },

  courseAction: {
    border: 0,
    background: 'transparent',
    color: '#2563eb',
    padding: '6px 10px 6px 0',
    cursor: 'pointer',
    fontWeight: 'bold',
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
    background: 'white',              // Change modal inside '+Add Event' background color
    color: '#1e293b',                  // Change popup letter/text color 
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

function CalendarPage() {
  const [events, setEvents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [localEvents, setLocalEvents] = useState(localCalendarEvents);
  useEffect(() => {
    const update = () => setLocalEvents(localCalendarEvents());
    const onStorage = (event) => {
      if (event.key === GROUP_STORAGE_KEY || event.key === null) update();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(GROUP_SCHEDULE_CHANGED, update);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(GROUP_SCHEDULE_CHANGED, update);
    };
  }, []);
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
    deadline: '',
    category: 'other',
    priority: 'medium',
    course: '',
    color: '#2563eb',
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

          const savedCourses = eventList
            .filter((event) => event.category === 'course')
            .map((course, index) => ({
              ...course,
              color: course.color || COURSE_COLORS[index % COURSE_COLORS.length],
            }));
          setCourses(savedCourses);
          setEvents(eventList
            .filter((event) => event.category !== 'course')
            .map((event) => toCalendarEvent(event, savedCourses)));
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
  function openAddForm(date = new Date(), category = 'other') {
    const start = new Date(date);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    setEditingId(null);

    setForm({
      title: '',
      description: '',
      start: toDateTimeLocal(start),
      end: toDateTimeLocal(end),
      deadline: toDateTimeLocal(end),
      category,
      priority: 'medium',
      course: '',
      color: category === 'course' ? suggestedCourseColor(courses) : '#2563eb',
    });

    setShowForm(true);
  }

  // Open the Edit Event popup.
  function openEditForm(info) {
    if (info.event.extendedProps.localGroupSchedule) {
      window.location.hash = 'group-scheduling';
      return;
    }
    const event = info.event;

    const start = event.start || new Date();
    const end =
      event.end ||
      new Date(start.getTime() + 60 * 60 * 1000);

    setEditingId(event.id);

    setForm({
      title: event.extendedProps.sourceTitle || event.title,
      description: event.extendedProps.description || '',
      start: toDateTimeLocal(start),
      end: toDateTimeLocal(end),
      deadline: toDateTimeLocal(event.extendedProps.deadline || end),
      category: event.extendedProps.category || 'other',
      priority: event.extendedProps.priority || 'medium',
      course: event.extendedProps.course || '',
      color: event.extendedProps.color || '#2563eb',
    });

    setShowForm(true);
  }

  function openEditCourse(course) {
    openEditForm({
      event: {
        id: String(course.id),
        title: course.title,
        start: new Date(course.start),
        end: new Date(course.end),
        extendedProps: {
          description: course.description || '',
          category: 'course',
          priority: course.priority || 'medium',
          course: course.title,
          color: course.color || '#2563eb',
        },
      },
    });
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

    let start;
    let end;
    if (form.category === 'assignment' || form.category === 'exam') {
      end = new Date(form.deadline);
      start = new Date(end.getTime() - 60 * 1000);
    } else if (form.category === 'course') {
      start = new Date(form.start);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(end.getDate() + 1);
    } else {
      start = new Date(form.start);
      end = new Date(form.end);
    }

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end <= start
    ) {
      alert(
        form.category === 'assignment' || form.category === 'exam'
          ? 'Please enter a valid deadline.'
          : 'The end date must be after the start date.'
      );
      return;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      start: start.toISOString(),
      end: end.toISOString(),
      category: form.category,
      priority: form.priority,
      course: form.category === 'course' ? form.title.trim() : form.course.trim() || null,
      color: form.category === 'course' ? form.color : null,
    };

    setSaving(true);
    setError('');

    try {
      const saved = editingId
        ? await updateEvent(editingId, payload)
        : await createEvent(payload);

      if (form.category === 'course') {
        const updatedCourses = editingId
          ? courses.map((course) => String(course.id) === editingId ? saved : course)
          : [...courses, saved];
        setCourses(updatedCourses);
        setEvents((previous) => previous.map((event) =>
          event.extendedProps.course.trim().toLocaleLowerCase() === saved.title.trim().toLocaleLowerCase()
            ? {
                ...event,
                backgroundColor: colorTint(saved.color),
                borderColor: saved.color,
                textColor: saved.color,
                extendedProps: { ...event.extendedProps, color: saved.color },
              }
            : event
        ));
      } else {
        const calendarEvent = toCalendarEvent(saved, courses);
        setEvents((previous) => editingId
          ? previous.map((event) => event.id === editingId ? calendarEvent : event)
          : [...previous, calendarEvent]);
      }

      closeForm();
    } catch (err) {
      setError(`Could not save event: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  // Delete an event through FastAPI.
  async function deleteRecord(id, type = 'event') {
    if (!id || saving) return;

    const confirmed = window.confirm(`Are you sure you want to delete this ${type}?`);

    if (!confirmed) return;

    setSaving(true);
    setError('');

    try {
      await deleteEvent(id);

      setEvents((previous) =>
        previous.filter((event) => event.id !== id)
      );
      setCourses((previous) => previous.filter((course) => String(course.id) !== id));

      if (editingId === id) closeForm();
    } catch (err) {
      setError(`Could not delete event: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    return deleteRecord(editingId, form.category === 'course' ? 'course' : 'event');
  }

  function handleDateClick(info) {
    openAddForm(info.date);
  }

  return (
    <div>
      {/* HEADER */}
      <header style={styles.header}>
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
        <p>Browser-local group events and busy times appear in purple. Select one to manage it in Group scheduling.</p>

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
          events={[...events, ...localEvents]}
          displayEventTime={false}
          eventDidMount={(info) => {
            const color = info.event.extendedProps.color;
            if (!color) return;

            const originalFilter = info.el.style.filter;
            const onMouseEnter = () => {
              info.el.style.filter = 'brightness(0.9)';
            };
            const onMouseLeave = () => {
              info.el.style.filter = originalFilter;
            };

            info.el.addEventListener('mouseenter', onMouseEnter);
            info.el.addEventListener('mouseleave', onMouseLeave);
            info.el._courseColorHoverCleanup = () => {
              info.el.removeEventListener('mouseenter', onMouseEnter);
              info.el.removeEventListener('mouseleave', onMouseLeave);
            };
          }}
          eventWillUnmount={(info) => info.el._courseColorHoverCleanup?.()}
          eventContent={(info) => {
            const time = formatCalendarTime(info.event.start);
            const { category, course, sourceTitle } = info.event.extendedProps;
            const icon = category === 'assignment' ? '📄' : category === 'exam' ? '📝' : '📅';
            const title = sourceTitle || info.event.title;
            const isDeadline = category === 'assignment' || category === 'exam';
            const courseColor = info.event.extendedProps.color;
            const infoTextStyle = courseColor ? { color: courseColor } : undefined;
            return (
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '5px',
                width: '100%',
                boxSizing: 'border-box',
                padding: '4px 6px',
                borderRadius: '4px',
                border: courseColor ? `1px solid ${courseColor}` : '1px solid transparent',
                lineHeight: 1.2,
              }}>
                <span aria-hidden="true" style={{ flex: '0 0 auto', ...infoTextStyle }}>{icon}</span>
                <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0, ...infoTextStyle }}>
                  <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</strong>
                  {course && <span style={{ fontSize: '0.78em', opacity: 0.9 }}>{course}</span>}
                  {time && <span style={{ fontSize: '0.78em', opacity: 0.9 }}>{isDeadline ? 'Due ' : ''}{time}</span>}
                </span>
              </div>
            );
          }}
          dateClick={handleDateClick}
          eventClick={openEditForm}
          height="auto"
        />
      </section>

      <section style={{ ...styles.calendarCard, marginTop: '24px' }} aria-labelledby="courses-heading">
        <h2 id="courses-heading">Courses</h2>
        {courses.length === 0 ? (
          <p>No courses saved yet. Use Add Event → Add Course to create one.</p>
        ) : (
          <div style={styles.courseGrid}>
            {courses.map((course) => {
              const relatedItems = events.filter((event) =>
                ['assignment', 'exam'].includes(event.extendedProps.category)
                && event.extendedProps.course.trim().toLocaleLowerCase() === course.title.trim().toLocaleLowerCase()
              );
              const assignmentCount = relatedItems.filter((event) => event.extendedProps.category === 'assignment').length;
              const examCount = relatedItems.filter((event) => event.extendedProps.category === 'exam').length;

              return (
                <article key={course.id} style={{ ...styles.courseCard, borderLeft: `6px solid ${course.color}` }}>
                  <h3>{course.title}</h3>
                  <p><strong>Priority:</strong> {course.priority}</p>
                  <p>{course.description || 'No course details added.'}</p>
                  <p>{assignmentCount} {assignmentCount === 1 ? 'assignment' : 'assignments'} · {examCount} {examCount === 1 ? 'exam' : 'exams'}</p>
                  <button type="button" style={styles.courseAction} onClick={() => openEditCourse(course)}>Edit</button>
                  <button
                    type="button"
                    style={{ ...styles.courseAction, color: '#b91c1c' }}
                    onClick={() => deleteRecord(String(course.id), 'course')}
                  >
                    Delete
                  </button>
                </article>
              );
            })}
          </div>
        )}
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
            <h2 aria-label={`${editingId ? 'Edit' : 'Add'} ${form.category === 'other' ? (editingId ? 'Event' : 'New Event') : `${form.category[0].toUpperCase()}${form.category.slice(1)}`}`}>
              {editingId
                ? `Edit ${form.category === 'other' ? 'Event' : `${form.category[0].toUpperCase()}${form.category.slice(1)}`}`
                : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    Add
                    <select
                      aria-label="Entry type"
                      value={form.category}
                      onChange={(e) => setForm((previous) => ({
                        ...previous,
                        category: e.target.value,
                        color: e.target.value === 'course' ? suggestedCourseColor(courses) : previous.color,
                      }))}
                      style={{ ...styles.input, width: 'auto', marginTop: 0, fontSize: '20px', fontWeight: 'bold' }}
                    >
                      <option value="other">Event</option>
                      <option value="assignment">Assignment</option>
                      <option value="exam">Exam</option>
                      <option value="course">Course</option>
                    </select>
                  </span>
                )}
            </h2>

            <form onSubmit={handleSubmit}>
              <label style={styles.label} htmlFor="event-title">
              {form.category === 'course'
                ? 'Course Name'
                : form.category === 'assignment'
                  ? 'Assignment Title'
                  : form.category === 'exam'
                    ? 'Exam Title'
                    : 'Event Title'}
              </label>

              <input
                id="event-title"
                style={styles.input}
                type="text"
                required
                value={form.title}
                onChange={(e) =>
                  updateField('title', e.target.value)
                }
                placeholder={form.category === 'course' ? 'e.g. Biology 101' : 'e.g. Research paper'}
              />                                                    {/* Change SE Meeting location....above */}

              {(form.category === 'assignment' || form.category === 'exam') && (
                <>
                  <label style={styles.label} htmlFor="event-course">Course</label>
                  <select
                    id="event-course"
                    style={styles.input}
                    value={form.course}
                    onChange={(e) => updateField('course', e.target.value)}
                    required={courses.length > 0}
                  >
                    <option value="">
                      {courses.length ? 'Choose a course' : 'No saved courses'}
                    </option>
                    {courses.map((course) => <option key={course.id} value={course.title}>{course.title}</option>)}
                  </select>
                </>
              )}

              <label style={styles.label} htmlFor="event-priority">Priority</label>
              <select
                id="event-priority"
                style={styles.input}
                value={form.priority}
                onChange={(e) => updateField('priority', e.target.value)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>

              {form.category === 'course' && (
                <>
                  <label style={styles.label} htmlFor="course-color">Course color</label>
                  <input
                    id="course-color"
                    type="color"
                    value={form.color}
                    onChange={(e) => updateField('color', e.target.value)}
                    aria-label="Course color"
                    style={{ width: '72px', height: '42px', padding: '3px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                  />
                </>
              )}

              <label style={styles.label}>
                Description                                         {/* Change Description location */}             
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
              />                                                    {/* Change Event Details inside Description Box, location */}  

              {(form.category === 'assignment' || form.category === 'exam') && (
                <>
                  <label style={styles.label} htmlFor="event-deadline">Deadline</label>
                  <input
                    id="event-deadline"
                    style={styles.input}
                    type="datetime-local"
                    required
                    value={form.deadline}
                    onChange={(e) => updateField('deadline', e.target.value)}
                  />
                </>
              )}

              {form.category !== 'course' && form.category !== 'assignment' && form.category !== 'exam' && (
                <>
                  <label style={styles.label} htmlFor="event-start">Start Date &amp; Time</label>
                  <input id="event-start" style={styles.input} type="datetime-local" required value={form.start} onChange={(e) => updateField('start', e.target.value)} />
                  <label style={styles.label} htmlFor="event-end">End Date &amp; Time</label>
                  <input id="event-end" style={styles.input} type="datetime-local" required value={form.end} onChange={(e) => updateField('end', e.target.value)} />
                </>
              )}

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
                    : `Create ${form.category === 'other' ? 'Event' : `${form.category[0].toUpperCase()}${form.category.slice(1)}`}`}
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
                  Cancel                                        {/* Change the 'Cancel' wording right here! */}
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
    </div>
  );
}

function App() {
  const readPage = () => window.location.hash === '#group-scheduling' ? 'groups' : 'calendar';
  const [page, setPage] = useState(readPage);

  useEffect(() => {
    const onHashChange = () => setPage(readPage());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    document.title = `${page === 'groups' ? 'Group scheduling' : 'Calendar'} | StudySync`;
  }, [page]);

  return (
    <main style={styles.page}>
      <header>
        <h1>📅 StudySync</h1>
        <p>Team Calendar &amp; Event Management</p>
        <nav className="app-navigation" aria-label="Main navigation">
          <a href="#calendar" aria-current={page === 'calendar' ? 'page' : undefined}>Calendar</a>
          <a href="#group-scheduling" aria-current={page === 'groups' ? 'page' : undefined}>Group scheduling</a>
        </nav>
      </header>
      {page === 'groups' ? <GroupScheduler /> : <CalendarPage />}
    </main>
  );
}

export default App;





