import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { db } from "./db";
import seedData from "../participants_seed.json";
import Home from "./pages/Home";
import EventList from "./pages/EventList";
import EventDashboard from "./pages/EventDashboard";
import NameBadgeGenerator from "./pages/NameBadgeGenerator";
import { applyTheme, loadTheme } from "@canonical/react-components";
import "./sass/styles.scss";

function App() {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const theme = loadTheme();
    applyTheme(theme);
  }, []);

  useEffect(() => {
    async function initDb() {
      const personCount = await db.people.count();
      if (personCount === 0) {
        console.log("QR-coon: Seeding local database...");
        await db.transaction(
          "rw",
          [db.people, db.events, db.eventAttendees],
          async () => {
            // Transform people to ensure directManager is a number or undefined
            const sanitizedPeople = seedData.people.map((p: any) => ({
              ...p,
              directManager:
                typeof p.directManager === "number"
                  ? p.directManager
                  : isNaN(parseInt(p.directManager))
                    ? undefined
                    : parseInt(p.directManager),
            }));

            await db.people.bulkAdd(sanitizedPeople);

            const eventsWithDates = seedData.events.map((e: any) => ({
              ...e,
              date: new Date(e.date),
            }));
            await db.events.bulkAdd(eventsWithDates);
            await db.eventAttendees.bulkAdd(seedData.attendees);
          },
        );
      }
      setIsHydrated(true);
    }
    initDb();
  }, []);

  if (!isHydrated) {
    return (
      <div className="p-text--center p-strip">
        <p className="p-heading--4">Waking up the Raccoon...</p>
        <i className="p-icon--spinner u-animation--spin"></i>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="application">
        <header>
          <Link to="/" className="u-flex u-flex--middle">
            <img src="/assets/logo.png" alt="QR-coon" />
            <span className="p-heading--4 u-no-margin">QR-coon</span>
          </Link>
        </header>

        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/events" element={<EventList />} />
            <Route path="/events/:eventId/:tab?" element={<EventDashboard />} />
            <Route path="/badges" element={<NameBadgeGenerator />} />
          </Routes>
        </main>

        <footer>
          <p className="p-text--small">Built for internal hack week 2026</p>
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;
