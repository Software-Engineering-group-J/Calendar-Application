import { test } from 'vitest';
import assert from 'node:assert/strict';
import { compareCalendars, isCalendarAvailable } from '../../src/groupEvents.js';

const event = (start, end) => ({
  start: `2026-10-14T${start}:00Z`,
  end: `2026-10-14T${end}:00Z`,
});
const schedule = (first, second) => ({
  event: event('14:00', '15:00'),
  users: [{ name: 'Alex', events: first }, { name: 'Sam', events: second }],
});

test('compareCalendars(schedule): two users are compatible when both are free', () => {
  assert.equal(compareCalendars(schedule(
    [event('12:00', '13:00')], [event('16:00', '17:00')],
  )), true);
});

test('compareCalendars supports more than two collaborators and checks the last calendar', () => {
  const proposed = schedule([], []);
  proposed.users.push({ name: 'Jordan', events: [] });
  assert.equal(compareCalendars(proposed), true);
  proposed.users[2].events.push(event('14:30', '15:30'));
  assert.equal(compareCalendars(proposed), false);
});

test('compareCalendars allows adjacent events but rejects enclosing events', () => {
  assert.equal(compareCalendars(schedule([event('13:00', '14:00')], [event('15:00', '16:00')])), true);
  assert.equal(compareCalendars(schedule([], [event('13:00', '16:00')])), false);
});

test('compareCalendars rejects invalid times and fewer than two participants', () => {
  assert.throws(() => compareCalendars({ ...schedule([], []), users: [] }), TypeError);
  assert.throws(() => compareCalendars({ ...schedule([], []), event: event('15:00', '14:00') }), RangeError);
});

test('free events do not block schedules, but legacy and explicitly busy events do', () => {
  const proposed = schedule([], [{ ...event('14:00', '15:00'), busy: false }]);
  assert.equal(compareCalendars(proposed), true);
  proposed.users[1].events[0].busy = true;
  assert.equal(compareCalendars(proposed), false);
  proposed.event.busy = false;
  assert.equal(compareCalendars(proposed), true);
  assert.equal(isCalendarAvailable(event('14:00', '15:00'), [event('14:00', '15:00')]), false);
});

