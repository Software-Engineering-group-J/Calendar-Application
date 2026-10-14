## Current Status

### Group events demo

The calendar supports named users and local group events for two users. Names are
case-insensitive when matching schedules. This is a browser-only demonstration,
not account authentication or synchronization between devices. Existing events
without a user name belong to `You`.

1. Run `npm run dev` and create a regular event for `Alex`, 1–2 PM.
2. Create a regular event for `Sam`, 3–4 PM on the same day.
3. Select **Group event (two users)** and enter `Alex` and `Sam`.
4. Create the group event for 2–3 PM: both users are free, so it saves.
5. Try another group event for 1:30–2:30 PM: it is rejected because Alex is busy.

### Running the compatibility test

Run `npm test` from the project directory. The single `compareCalendars` test uses Node's built-in test
runner and requires no additional test packages. Expected result: **1 passed,
0 failed**.

`compareCalendars(schedule)` is exported from `src/groupEvents.js`. Its argument
contains the proposed `event` (start/end) and `users`, each with a name and an
array of existing busy events. It returns `true` when all users are free for the
entire proposed event, or `false` when any event overlaps. Invalid time ranges
or missing user schedules throw an error. Events touching at their boundaries
are compatible. The UI excludes the event being edited from this comparison.

Example:

```js
compareCalendars({
  event: { start: '2026-10-14T14:00:00Z', end: '2026-10-14T15:00:00Z' },
  users: [
    { name: 'Alex', events: [] },
    { name: 'Sam', events: [] },
  ],
}); // true
```

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
