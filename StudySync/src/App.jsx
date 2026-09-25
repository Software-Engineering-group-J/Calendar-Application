import './App.css'
import { useState } from 'react'

function App() {
  const [showForm, setShowForm] = useState(false)

  return (
    <div>
      <header>
        <h1>StudySync</h1>

        <nav>
          <button>Calendar</button>
          <button>Courses</button>
          <button>Assignments</button>
        </nav>
      </header>

      <main>
        <h2>
          {new Date().toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric"
          })}
        </h2>

        <section>
          <h3>Today's Schedule</h3>

          <div>
            <h4>CS 2614</h4>
            <p>Data Structures</p>
            <p>9:00 AM - 10:00 AM</p>
          </div>

          <div>
            <h4>Study Session</h4>
            <p>Prepare for upcoming exam</p>
            <p>11:00 AM - 1:00 PM</p>
          </div>
        </section>

        <button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Close" : "Add Event"}
        </button>

        {showForm && (
          <form>
            <h3>Add Event</h3>

            <label>Event Name</label>
            <input type="text" />

            <label>Date</label>
            <input type="date" />

            <label>Start Time</label>
            <input type="time" />

            <label>End Time</label>
            <input type="time" />

            <button type="button">Save Event</button>
          </form>
        )}
      </main>
    </div>
  )
}

export default App