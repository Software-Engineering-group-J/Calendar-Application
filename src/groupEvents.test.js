import test from 'node:test';
import assert from 'node:assert/strict';
import { compareCalendars } from './groupEvents.js';

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

