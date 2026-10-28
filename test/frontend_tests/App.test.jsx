// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App.jsx';

vi.mock('@fullcalendar/react', () => ({
  default: ({ events = [], dateClick, eventClick }) => (
    <div aria-label="Calendar">
      <button
        type="button"
        onClick={() => dateClick({ date: new Date('2026-04-15T10:00:00') })}
      >
        Choose date
      </button>
      {events.map((event) => (
        <button
          key={event.id}
          type="button"
          onClick={() =>
            eventClick({
              event: {
                ...event,
                start: new Date(event.start),
                end: new Date(event.end),
              },
            })
          }
        >
          {event.title}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('@fullcalendar/daygrid', () => ({
  default: {},
}));

vi.mock('@fullcalendar/timegrid', () => ({
  default: {},
}));

vi.mock('@fullcalendar/interaction', () => ({
  default: {},
}));



function jsonResponse(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  };
}

function serverEvent(overrides = {}) {
  return {
    id: 'server-event-1',
    title: 'Study session',
    description: 'Original details',
    start: '2026-04-15T10:00:00.000Z',
    end: '2026-04-15T11:00:00.000Z',
    priority: 'medium',
    category: 'other',
    status: 'pending',
    completed: false,
    ...overrides,
  };
}

async function waitForInitialLoad() {
  await waitFor(() => {
    expect(screen.queryByText('Loading events...')).not.toBeInTheDocument();
  });
}

function getDateTimeInputs() {
  const modal = screen.getByRole('heading', { name: /^(Add New Event|Edit Event)$/ }).parentElement;
  return modal.querySelectorAll('input[type="datetime-local"]');
}

function fillEventForm({ title, description = '', start, end }) {
  fireEvent.change(screen.getByLabelText('Event Title'), {
    target: { value: title },
  });
  fireEvent.change(screen.getByPlaceholderText('Event details...'), {
    target: { value: description },
  });
  const [startInput, endInput] = getDateTimeInputs();
  fireEvent.change(startInput, { target: { value: start } });
  fireEvent.change(endInput, { target: { value: end } });
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ events: [] })));
  vi.spyOn(window, 'alert').mockImplementation(() => {});
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

it('shows saved local group events even when the API is unavailable', async () => {
  localStorage.setItem('studysync-group-scheduling-v1', JSON.stringify({
    participants: [{ id: 'alex', name: 'Alex' }, { id: 'sam', name: 'Sam' }],
    events: [{ id: 'local-1', title: 'Group review', start: '2026-10-21T10:00:00Z',
      end: '2026-10-21T11:00:00Z', participantIds: ['alex', 'sam'] }],
  }));
  fetch.mockRejectedValue(new Error('Backend offline'));
  render(<App />);
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Backend offline'));
  expect(screen.getByRole('button', { name: 'Group: Group review' })).toBeInTheDocument();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('StudySync calendar', () => {
  it('loads events from the backend and opens and cancels the add-event form', async () => {
    render(<App />);
    await waitForInitialLoad();

    expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:8000/api/events');
    fireEvent.click(screen.getByRole('button', { name: /add event/i }));
    expect(screen.getByRole('heading', { name: 'Add New Event' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('heading', { name: 'Add New Event' })).not.toBeInTheDocument();
  });

  it('creates an event through the backend and displays its response', async () => {
    const createdEvent = serverEvent({
      id: 'created-event',
      title: 'Biology review',
      description: 'Chapter 4',
    });
    fetch
      .mockResolvedValueOnce(jsonResponse({ events: [] }))
      .mockResolvedValueOnce(jsonResponse(createdEvent, 201));
    render(<App />);
    await waitForInitialLoad();

    fireEvent.click(screen.getByRole('button', { name: /add event/i }));
    fillEventForm({
      title: 'Biology review',
      description: 'Chapter 4',
      start: '2026-04-15T10:00',
      end: '2026-04-15T11:00',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create Event' }));

    expect(await screen.findByRole('button', { name: 'Biology review' })).toBeInTheDocument();
    expect(fetch.mock.calls[1][0]).toBe('http://127.0.0.1:8000/api/events');
    expect(fetch.mock.calls[1][1].method).toBe('POST');
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({
      title: 'Biology review',
      description: 'Chapter 4',
      start: new Date('2026-04-15T10:00').toISOString(),
      end: new Date('2026-04-15T11:00').toISOString(),
      category: 'other',
      priority: 'medium',
      course: null,
      color: null,
    });
  });

  it('prefills a new event with the date selected on the calendar', async () => {
    render(<App />);
    await waitForInitialLoad();
    fireEvent.click(screen.getByRole('button', { name: 'Choose date' }));

    const [startInput, endInput] = getDateTimeInputs();
    expect(startInput.value).toBe('2026-04-15T10:00');
    expect(endInput.value).toBe('2026-04-15T11:00');
  });

  it('rejects an event whose end is not after its start', async () => {
    render(<App />);
    await waitForInitialLoad();
    fireEvent.click(screen.getByRole('button', { name: /add event/i }));
    fillEventForm({
      title: 'Invalid event',
      start: '2026-04-15T11:00',
      end: '2026-04-15T10:00',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create Event' }));

    expect(window.alert).toHaveBeenCalledWith('The end date must be after the start date.');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('heading', { name: 'Add New Event' })).toBeInTheDocument();
  });

  it('updates and deletes an event through the backend', async () => {
    const existingEvent = serverEvent();
    const updatedEvent = serverEvent({
      title: 'Updated study session',
      description: 'Revised details',
      start: '2026-04-15T12:00:00.000Z',
      end: '2026-04-15T13:00:00.000Z',
    });
    fetch
      .mockResolvedValueOnce(jsonResponse({ events: [existingEvent] }))
      .mockResolvedValueOnce(jsonResponse(updatedEvent))
      .mockResolvedValueOnce(jsonResponse({ message: 'Event deleted successfully.' }));
    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: 'Study session' }));
    expect(screen.getByRole('heading', { name: 'Edit Event' })).toBeInTheDocument();
    fillEventForm({
      title: 'Updated study session',
      description: 'Revised details',
      start: '2026-04-15T12:00',
      end: '2026-04-15T13:00',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(await screen.findByRole('button', { name: 'Updated study session' })).toBeInTheDocument();
    expect(fetch.mock.calls[1][0]).toBe('http://127.0.0.1:8000/api/events/server-event-1');
    expect(fetch.mock.calls[1][1].method).toBe('PUT');

    fireEvent.click(screen.getByRole('button', { name: 'Updated study session' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));
    expect(fetch.mock.calls[2][0]).toBe('http://127.0.0.1:8000/api/events/server-event-1');
    expect(fetch.mock.calls[2][1].method).toBe('DELETE');
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Updated study session' })).not.toBeInTheDocument();
    });
  });
});
