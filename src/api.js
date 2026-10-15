
const API_URL = import.meta.env.VITE_API_URL ?? (
  import.meta.env.DEV ? 'http://127.0.0.1:8000' : ''
);

// ==========================================
// GET ALL EVENTS
// ==========================================
export async function getEvents() {
  const response = await fetch(`${API_URL}/api/events`);

  if (!response.ok) {
    throw new Error(`Failed to load events: ${response.status}`);
  }

  const data = await response.json();

  return data.events ?? [];
}

// ==========================================
// CREATE A NEW EVENT
// ==========================================
export async function createEvent(event) {
  const response = await fetch(`${API_URL}/api/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create event: ${error}`);
  }

  return await response.json();
}

// ==========================================
// UPDATE AN EXISTING EVENT
// ==========================================
export async function updateEvent(id, event) {
  const response = await fetch(`${API_URL}/api/events/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update event: ${error}`);
  }

  return await response.json();
}

// ==========================================
// DELETE AN EVENT
// ==========================================
export async function deleteEvent(id) {
  const response = await fetch(`${API_URL}/api/events/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to delete event: ${error}`);
  }

  return await response.json();
}
