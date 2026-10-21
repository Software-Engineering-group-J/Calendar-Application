// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import GroupScheduler from './GroupScheduler.jsx';

beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function add(name) {
  fireEvent.change(screen.getByLabelText('Participant name'), { target: { value: name } });
  fireEvent.click(screen.getByRole('button', { name: 'Add participant' }));
}

function fill(title, start, end, names) {
  fireEvent.change(screen.getByLabelText('Event title'), { target: { value: title } });
  fireEvent.change(screen.getByLabelText('Start time'), { target: { value: start } });
  fireEvent.change(screen.getByLabelText('End time'), { target: { value: end } });
  const participants = screen.getByRole('group', { name: 'Participants for this event' });
  for (const name of names) fireEvent.click(within(participants).getByLabelText(name));
}

test('blocks a conflict in the third calendar, saves a compatible group, and restores it on reload', () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch');
  const view = render(<GroupScheduler />);
  for (const name of ['Alex', 'Sam', 'Jordan']) add(name);
  fill('Jordan class', '2026-10-21T10:00', '2026-10-21T11:00', ['Jordan']);
  fireEvent.click(screen.getByRole('button', { name: 'Save busy event' }));
  fill('Group study', '2026-10-21T10:30', '2026-10-21T11:30', ['Alex', 'Sam', 'Jordan']);
  fireEvent.click(screen.getByRole('button', { name: 'Save group event' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Time conflict for: Jordan');
  expect(screen.queryByRole('button', { name: 'Edit Group study' })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Start time'), { target: { value: '2026-10-21T11:00' } });
  fireEvent.change(screen.getByLabelText('End time'), { target: { value: '2026-10-21T12:00' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save group event' }));
  expect(screen.getByRole('status')).toHaveTextContent('All selected participants are available');
  expect(screen.getByText('Participants: Alex, Sam, Jordan')).toBeInTheDocument();
  view.unmount();
  render(<GroupScheduler />);
  fireEvent.click(screen.getByRole('button', { name: 'Edit Group study' }));
  expect(screen.getByLabelText('Alex')).toBeChecked();
  expect(screen.getByLabelText('Sam')).toBeChecked();
  expect(screen.getByLabelText('Jordan')).toBeChecked();
  fireEvent.click(screen.getByRole('button', { name: 'Save group event' }));
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Delete Group study' }));
  expect(screen.queryByRole('button', { name: 'Edit Group study' })).not.toBeInTheDocument();
  expect(fetchSpy).not.toHaveBeenCalled();
});

test('rejects duplicate participants and reports unavailable storage', () => {
  render(<GroupScheduler />);
  add('Alex');
  add('alex');
  expect(screen.getByRole('alert')).toHaveTextContent('already exists');
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage full'); });
  add('Sam');
  expect(screen.getByRole('alert')).toHaveTextContent('Could not save');
  expect(screen.queryByRole('button', { name: 'Remove participant Sam' })).not.toBeInTheDocument();
});

test('blocks overlapping personal busy events but allows a free event and preserves its setting', () => {
  render(<GroupScheduler />);
  add('Alex');
  fill('Class', '2026-10-21T10:00', '2026-10-21T11:00', ['Alex']);
  fireEvent.click(screen.getByRole('button', { name: 'Save busy event' }));
  fill('Optional workshop', '2026-10-21T10:30', '2026-10-21T12:00', ['Alex']);
  fireEvent.click(screen.getByRole('button', { name: 'Save busy event' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Time conflict for: Alex');
  fireEvent.change(screen.getByLabelText('Show as'), { target: { value: 'free' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save free event' }));
  expect(screen.getByRole('status')).toHaveTextContent('Free event saved');
  fireEvent.click(screen.getByRole('button', { name: 'Edit Optional workshop' }));
  expect(screen.getByLabelText('Show as')).toHaveValue('free');
  fireEvent.change(screen.getByLabelText('Show as'), { target: { value: 'busy' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save busy event' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Time conflict for: Alex');
});
