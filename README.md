# StudySync

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
