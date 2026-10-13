// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.jsx';

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

vi.mock('@fullcalendar/react/daygrid', () => ({ default: {} }));
vi.mock('@fullcalendar/react/timegrid', () => ({ default: {} }));
vi.mock('@fullcalendar/react/interaction', () => ({ default: {} }));
vi.mock('@fullcalendar/react/themes/classic', () => ({ default: {} }));

const storageKey = 'studysync-events-v2';

function getDateTimeInputs() {
  return document.querySelectorAll('input[type="datetime-local"]');
}

function fillEventForm({ title, description = '', start, end }) {
  fireEvent.change(screen.getByPlaceholderText(/software engineering meeting/i), {
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
  vi.stubGlobal('crypto', { randomUUID: vi.fn(() => 'event-1') });
  vi.spyOn(window, 'alert').mockImplementation(() => {});
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('StudySync calendar', () => {
  it('opens and cancels the add-event form', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /add event/i }));
    expect(screen.getByRole('heading', { name: 'Add New Event' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('heading', { name: 'Add New Event' })).not.toBeInTheDocument();
  });

  it('creates an event and retains it in local storage after remounting', () => {
    const view = render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /add event/i }));
    fillEventForm({
      title: 'Biology review',
      description: 'Chapter 4',
      start: '2026-04-15T10:00',
      end: '2026-04-15T11:00',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create Event' }));

    expect(screen.getByRole('button', { name: 'Biology review' })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(storageKey))).toEqual([
      expect.objectContaining({
        id: 'event-1',
        title: 'Biology review',
        extendedProps: { description: 'Chapter 4' },
      }),
    ]);

    view.unmount();
    render(<App />);
    expect(screen.getByRole('button', { name: 'Biology review' })).toBeInTheDocument();
  });

  it('prefills a new event with the date selected on the calendar', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose date' }));

    const [startInput, endInput] = getDateTimeInputs();
    expect(startInput.value).toBe('2026-04-15T10:00');
    expect(endInput.value).toBe('2026-04-15T11:00');
  });

  it('rejects an event whose end is not after its start', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /add event/i }));
    fillEventForm({
      title: 'Invalid event',
      start: '2026-04-15T11:00',
      end: '2026-04-15T10:00',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create Event' }));

    expect(window.alert).toHaveBeenCalledWith('The end date must be after the start date.');
    expect(localStorage.getItem(storageKey)).toBeNull();
    expect(screen.getByRole('heading', { name: 'Add New Event' })).toBeInTheDocument();
  });

  it('edits an existing event and deletes it after confirmation', () => {
    localStorage.setItem(storageKey, JSON.stringify([
      {
        id: 'existing-event',
        title: 'Study session',
        start: '2026-04-15T10:00:00.000Z',
        end: '2026-04-15T11:00:00.000Z',
        extendedProps: { description: 'Original details' },
      },
    ]));
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Study session' }));
    expect(screen.getByRole('heading', { name: 'Edit Event' })).toBeInTheDocument();
    fillEventForm({
      title: 'Updated study session',
      description: 'Revised details',
      start: '2026-04-15T12:00',
      end: '2026-04-15T13:00',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(screen.getByRole('button', { name: 'Updated study session' })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(storageKey))[0]).toEqual(
      expect.objectContaining({
        id: 'existing-event',
        title: 'Updated study session',
        extendedProps: { description: 'Revised details' },
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Updated study session' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(window.confirm).toHaveBeenCalled();
    expect(localStorage.getItem(storageKey)).toBe('[]');
    expect(screen.queryByRole('button', { name: 'Updated study session' })).not.toBeInTheDocument();
  });
});