# StudySync

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

[![Frontend CI/CD Pipeline](https://github.com/Supazz/Calendar-Application/actions/workflows/ci.yml/badge.svg?branch=CIpipeline)](https://github.com/Supazz/Calendar-Application/actions/workflows/ci.yml)

## Current Status

StudySync is currently in the early development phase.

The React frontend has been developed using React, Vite, and FullCalendar.

**Currently implemented frontend features:**

- Interactive calendar with Month, Week, and Day views
- Calendar navigation between dates
- Add Event form for creating new events
- Event titles and descriptions
- Start and end date/time selection
- Editing existing events
- Deleting events
- Validation of event titles and date/time ranges
- Browser-based event persistence using localStorage

Events are currently stored locally in the user's browser. They remain available after refreshing the page but are not yet shared between users or synchronized with a backend database.

The Python backend is being developed separately from the React frontend. Backend integration and centralized database storage remain future development tasks.



### Frontend

- React - User interface and component management
- Vite - Frontend development and build tool
- JavaScript - Frontend programming
- CSS - Application styling
- FullCalendar - Interactive calendar, date navigation, and event display
- localStorage - Temporary browser-based event persistence

### Backend (Under Development)

- Python - Planned backend programming and application logic
- SQLite - Planned database storage
- Canvas REST API - Planned integration for importing courses, assignments, and due dates

### Clone the Repository

Open a terminal and navigate to the location where you want to store the project.

Then clone the repository:

```bash
git clone https://github.com/Supazz/Calendar-Application.git
cd Calendar-Application
```

### Frontend Setup

Install the React dependencies:

```bash
npm install
```

## Running the Application

The React frontend can currently be run independently using:

```bash
npm run dev
```

Vite will provide a local URL where the application can be opened in a web browser.

To exit Vite, press Ctrl + C while in the terminal. 

The backend is currently under development and is not yet fully connected to the React frontend.





## Development Workflow

The project uses Scrum and is developed through sprints and product backlog items.

Team members should:
1. Create or select an issue describing the work to be completed.
2. Create a feature branch for the work.
3. Make and test changes on the feature branch.
4. Commit changes using clear commit messages.
5. Push the branch to GitHub.
6. Open a pull request for review.
7. Merge the completed work into the main branch after review.

### Branches

- `main` - Main project branch
- Feature branches - Used for individual features and changes
- Frontend/backend branches may be used for larger areas of development

### Development Guidelines

- Keep changes related to the issue or feature being developed.
- Use descriptive commit messages.
- Test changes before creating a pull request.
- Do not commit passwords, API keys, or other sensitive information.
- Keep documentation updated when project functionality or setup requirements change.
- Communicate with the team before making major structural changes.
- Create a separate branch for new features or significant changes.
- Do not directly modify the main branch unless the team has agreed that the change should be made there.


## Future Development

- Connecting the React frontend to the Python backend
- Implementing SQLite database storage
- Replacing browser localStorage with backend-managed event persistence
- Adding course management
- Adding assignment and exam management
- Implementing task priorities and estimated completion times
- Allowing students to enter available study times
- Implementing automated study schedule generation
- Adding task completion and progress tracking
- Improving calendar functionality and event categorization
- Integrating the Canvas REST API
- Exploring email integration
- Supporting shared data across users

## Team Members

- Diego Arauz
- Carlos Garcia
- Andrew Nguyen
- Jon Pack
- Zachary Pursell
