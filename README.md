# StudySync

[![Frontend CI/CD Pipeline](https://github.com/Supazz/Calendar-Application/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Supazz/Calendar-Application/actions/workflows/ci.yml)

## Project status — October 20, 2026

StudySync is a calendar application with a React frontend connected to a Python FastAPI backend.

- The frontend provides a calendar with month, week, and day views, navigation, and event creation, editing, and deletion.
- The frontend sends event requests to the backend through its REST API.
- The backend validates and serves events, and includes endpoints for filtering, upcoming events, scheduling conflicts, and event statistics.
- The backend currently stores events in memory. Events are lost when the backend process restarts; persistent database storage has not been implemented.
- GitHub Actions runs frontend linting, build, and tests on pushes and pull requests. After a successful run on `main`, it waits for the matching AWS Amplify frontend deployment and reports whether it is healthy.

## Technology

- **Frontend:** React, Vite, JavaScript, FullCalendar
- **Backend:** Python, FastAPI, Pydantic, Uvicorn
- **Hosting and automation:** AWS Amplify for the frontend; GitHub Actions for CI and production deployment verification

## Run the application locally

Before starting, install **Node.js 22 or newer** (which includes npm) and **Python 3.10 or newer**. Get Node.js from [nodejs.org](https://nodejs.org/) and Python from [python.org](https://www.python.org/).

Run the backend and frontend in separate terminals. The frontend's development API URL defaults to `http://127.0.0.1:8000`, so no local `.env` file is required.

### 1. Clone the repository

```bash
git clone https://github.com/Supazz/Calendar-Application.git
cd Calendar-Application
```

### 2. Install backend dependencies and start the backend

From the repository root, create and activate a virtual environment, install the pinned backend dependencies, and start FastAPI. The virtual environment keeps project packages separate from other Python projects on the machine.

**macOS/Linux**

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r backend/requirements.txt
python -m uvicorn main:app --app-dir backend --reload --host 127.0.0.1 --port 8000
```

**Windows PowerShell**

```powershell
py -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r backend/requirements.txt
python -m uvicorn main:app --app-dir backend --reload --host 127.0.0.1 --port 8000
```

The API is available at `http://127.0.0.1:8000`. Interactive API documentation is at `http://127.0.0.1:8000/docs`. Keep this terminal running while using the app.

### 3. Start the frontend

In a second terminal, from the repository root:

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`. The backend allows the default Vite local origins on ports 5173–5175.

To stop either server, press `Ctrl+C` in its terminal. Because backend storage is in memory, restarting the backend clears the events.

## CI/CD and production hosting

The workflow is [`.github/workflows/ci.yml`](.github/workflows/ci.yml). On pushes and pull requests, it installs Node.js dependencies, runs linting, builds the frontend, and runs the frontend tests. On `main`, it also verifies the production deployment status in AWS Amplify.

AWS and deployment values are configured as GitHub Actions **variables** for the `production` environment: `AWS_ROLE_ARN`, `AWS_REGION`, `AMPLIFY_APP_ID`, and `PRODUCTION_URL`. The IAM role must trust the GitHub OIDC provider and allow the Amplify deployment action to update the app.

## Development commands

### Frontend tests

These tests use Node.js/npm and do **not** require Python or a running backend. From the repository root, install the locked JavaScript dependencies (once per checkout), then run the Vitest suite:

```bash
npm ci
npm run test:run
```

`npm test` runs the same one-shot test suite. `npm run test:watch` keeps Vitest running and watches for changes. GitHub Actions runs `npm run test:run`.

### Backend tests

These tests use Python and do **not** require Node.js/npm or a running backend server. From the repository root, create and activate a virtual environment as shown in **Run the application locally**, then install the backend requirements and run the backend unit tests:

```bash
python -m pip install -r backend/requirements.txt
python -m unittest backend.test_events
```

On Windows, use `py -m pip install -r backend/requirements.txt` if `python` is not on PATH. The test command can still be run with `python -m unittest backend.test_events` after activating the environment.

### Frontend quality checks

These optional checks also use Node.js/npm:

```bash
npm run lint
npm run build
```

## Current limitations and next steps

- Add persistent database storage so events survive backend restarts and can be shared across sessions.
- Deploy the FastAPI backend and configure production CORS and the frontend's `VITE_API_URL`.
- Connect additional StudySync features such as courses, assignments, and study planning to the API.
- Explore Canvas integration after the core application and storage are established.

## Development workflow

The project uses Scrum and feature branches. Changes should be tested, pushed to GitHub, and reviewed in a pull request before merging into `main`.

## Backlog

Our backlog is tracked in GitHub Issues so the team can add, prioritize, and assign work as new features and tasks are identified. The current backlog includes planned enhancements, sprint items, and open engineering tasks for future development.

View the active backlog, sprint tracking, and kanban board here:

- [GitHub Issues](https://github.com/Software-Engineering-group-J/Calendar-Application/issues)
- [Sprint 2 milestone / backlog](https://github.com/Software-Engineering-group-J/Calendar-Application/milestone/2)
- [Kanban board](https://github.com/orgs/Software-Engineering-group-J/projects/1/views/1)

## Group scheduling demo

Each event has a **Show as: Busy / Free** setting, independent of participant
count. Busy is the default (including older saved events). Overlapping busy
events are rejected for both personal and group events. Free events may overlap
and do not block later bookings. The setting applies to the entire event and
all its participants; to represent partial attendance, record only the actual
busy interval as a separate event. Editing preserves this setting.

Open **Group scheduling** from the main navigation, or go directly to
`/#group-scheduling`. The default Calendar page remains focused on the existing
API-backed Team Schedule. Browser back/forward works between these views.

The **Group scheduling** page is a browser-local prototype independent of the
API-backed Team Schedule. Participants are manually managed, with unique
IDs and distinct display names. There are no accounts or cross-device sharing.
Local schedules persist in browser storage under `studysync-group-scheduling-v1`.
Using a different browser or origin starts a separate schedule; clearing browser
storage removes it.

1. Add Alex, Sam, and Jordan as participants.
2. Enter a busy event for Jordan, 10–11 AM, selecting only Jordan.
3. Propose a group event for 10:30–11:30 AM with all three selected. Saving is
   rejected and Jordan is identified as unavailable.
4. Change the group event to 11 AM–noon and save. Events touching at their
   boundaries are compatible.
5. Refresh the page: the saved events remain. Edit the group event to verify all
   participants are retained, or delete it to free their time.

Return to Calendar to see local group events and busy times in purple alongside
API events. They appear even if the backend is offline. Navigate to the event's
date if it is outside the displayed month. Clicking a local event opens Group
scheduling, where it can be edited or deleted. These local events are not
uploaded to the API.

Selecting one participant records busy time; selecting two or more creates a
group event, without a fixed participant limit. Existing group events also block
their participants' time. Editing excludes the event itself from comparison.
Remove participants from their events before deleting participant records.

`src/groupEvents.js` exports `compareCalendars(schedule)`, used by the form and
the automated compatibility tests. Run `npm test` or `npm run test:run` to run
Vitest, the same runner used by GitHub Actions. Tests cover the original two-user
case, larger groups, a conflict in the last calendar, boundary times, invalid
input, and the browser-local UI workflow. API responses are not required by this
feature. The existing Team Schedule still needs a reachable backend.

For a live CI/CD review, change a group-scheduling behavior or message with its
corresponding test, push a feature branch, inspect GitHub Actions, and merge by
PR to deploy the frontend through Amplify.

## Team

- Diego Arauz
- Carlos Garcia
- Andrew Nguyen
- Jon Pack
- Zachary Pursell
