
# StudySync

![StudySync CI](https://github.com/Supazz/Calendar-Application/actions/workflows/ci.yml/badge.svg?branch=CIpipeline)


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
- Event loading and management through the Python FastAPI backend

The React frontend sends event requests to the FastAPI backend. During local development, Vite proxies `/api` requests to `http://127.0.0.1:8000`. The backend currently stores events in memory, so restarting it clears them; database persistence remains future work.

### Frontend

- React - User interface and component management
- Vite - Frontend development and build tool
- JavaScript - Frontend programming
- CSS - Application styling
- FullCalendar - Interactive calendar, date navigation, and event display
- FastAPI REST API - Event loading, creation, editing, and deletion

### Backend

- Python and FastAPI - Backend API and event validation
- In-memory event storage - Temporary; cleared when the server restarts
- SQLite or PostgreSQL - Possible future persistent storage
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

Start the backend in one terminal from the repository root:

```powershell
python -m venv backend/.venv
.\backend\.venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --port 8000
```

Then start the frontend in a second terminal:

```bash
npm install
npm run dev
```

Open the URL printed by Vite. The backend API and interactive documentation are available at `http://127.0.0.1:8000` and `http://127.0.0.1:8000/docs`.





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

- Replacing in-memory event storage with SQLite or PostgreSQL
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
