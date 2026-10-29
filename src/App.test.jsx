
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import App from './App.jsx';
import { getEvents, createEvent } from './api.js';

// Fake backend calls so FastAPI doesn't need to run.
vi.mock('./api.js', () => ({
  getEvents: vi.fn(),
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
}));

// Fake calendar so we only test the Add Event feature.
vi.mock('@fullcalendar/react', () => ({
  default: () => <div>Mock Calendar</div>,
}));

beforeEach(() => {
  vi.clearAllMocks();
  getEvents.mockResolvedValue({ events: [] });
  vi.spyOn(window, 'alert').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// Helper to open the Add Event form.
function openAddEvent() {
  fireEvent.click(
    screen.getByRole('button', { name: /\+?\s*add event/i })
  );
}

// Helper to enter event information.
function fillEventForm(container, title, description, start, end) {
  fireEvent.change(
    screen.getByPlaceholderText(/software engineering meeting/i),
    { target: { value: title } }
  );

  fireEvent.change(
    screen.getByPlaceholderText(/event details/i),
    { target: { value: description } }
  );

  const dates = container.querySelectorAll(
    'input[type="datetime-local"]'
  );

  fireEvent.change(dates[0], {
    target: { value: start },
  });

  fireEvent.change(dates[1], {
    target: { value: end },
  });
}

describe('StudySync Add Event', () => {

  it('opens the Add Event form', () => {
    render(<App />);

    openAddEvent();

    expect(
      screen.getByText('Add New Event')
    ).toBeInTheDocument();
  });

  it('creates an event with valid information', async () => {
    createEvent.mockResolvedValue({
      id: 1,
      title: 'Study Session',
      description: 'Prepare for exam',
      start: '2026-11-02T14:00:00Z',
      end: '2026-11-02T15:00:00Z',
    });

    const { container } = render(<App />);

    openAddEvent();

    fillEventForm(
      container,
      'Study Session',
      'Prepare for exam',
      '2026-11-02T14:00',
      '2026-11-02T15:00'
    );

    fireEvent.click(
      screen.getByRole('button', { name: /create event/i })
    );

    await waitFor(() => {
      expect(createEvent).toHaveBeenCalledOnce();
    });

    expect(createEvent).toHaveBeenCalledWith({
      title: 'Study Session',
      description: 'Prepare for exam',
      start: new Date('2026-11-02T14:00').toISOString(),
      end: new Date('2026-11-02T15:00').toISOString(),
    });

    await waitFor(() => {
      expect(
        screen.queryByText('Add New Event')
      ).not.toBeInTheDocument();
    });
  });

  it('does not create an event with an empty title', () => {
    render(<App />);

    openAddEvent();

    fireEvent.click(
      screen.getByRole('button', { name: /create event/i })
    );

    expect(createEvent).not.toHaveBeenCalled();
  });

  it('rejects an end time before the start time', () => {
    const { container } = render(<App />);

    openAddEvent();

    fillEventForm(
      container,
      'Study Session',
      'Prepare for exam',
      '2026-11-02T15:00',
      '2026-11-02T14:00'
    );

    fireEvent.click(
      screen.getByRole('button', { name: /create event/i })
    );

    expect(window.alert).toHaveBeenCalledWith(
      'The end date must be after the start date.'
    );

    expect(createEvent).not.toHaveBeenCalled();
  });

  it('closes the form when Cancel is clicked', () => {
    render(<App />);

    openAddEvent();

    fireEvent.click(
      screen.getByRole('button', { name: /cancel/i })
    );

    expect(
      screen.queryByText('Add New Event')
    ).not.toBeInTheDocument();

    expect(createEvent).not.toHaveBeenCalled();
  });

});

