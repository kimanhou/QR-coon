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

async function uploadPendingScans() {
  const pendingScans = await db.scans.where("uploaded").equals(0).toArray();
  if (pendingScans.length === 0) return;

  console.log(`QR-coon: Attempting to upload ${pendingScans.length} scans...`);
  for (const scan of pendingScans) {
    try {
      const response = await fetch("/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: scan.eventId,
          person_id: scan.personId,
          timestamp: scan.timestamp,
          method: scan.method,
        }),
      });

      if (response.ok) {
        await db.scans.update(scan.id, { uploaded: 1 });
      }
    } catch (err) {
      console.error("Manual sync failed for scan:", scan.id, err);
    }
  }
}

function App() {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const theme = loadTheme();
    applyTheme(theme);
  }, []);

  useEffect(() => {
    async function initSync() {
      if ("serviceWorker" in navigator) {
        try {
          const registration = await navigator.serviceWorker.register("/sw.js");
          console.log(
            "QR-coon: Service Worker registered with scope:",
            registration.scope,
          );

          await navigator.serviceWorker.ready;

          if ("periodicSync" in registration) {
            const status = await navigator.permissions.query({
              name: "periodic-background-sync" as PermissionName,
            });

            if (status.state === "granted") {
              await (registration as any).periodicSync.register(
                "upload-scans",
                {
                  minInterval: 60 * 1000,
                },
              );
              console.log("QR-coon: Periodic sync registered");
            } else {
              console.warn(
                "QR-coon: Periodic sync permission denied. Using interval fallback.",
              );
              setInterval(uploadPendingScans, 60000);
            }
          } else {
            console.log(
              "QR-coon: PeriodicSync not supported. Using interval fallback.",
            );
            setInterval(uploadPendingScans, 60000);
          }
        } catch (err) {
          console.error(
            "QR-coon: Service Worker or Sync registration failed",
            err,
          );
          setInterval(uploadPendingScans, 60000);
        }
      }
    }
    initSync();
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
            await db.people.bulkPut(seedData.people);

            const eventsWithDates = seedData.events.map((e: any) => ({
              ...e,
              date: new Date(e.date),
            }));
            await db.events.bulkPut(eventsWithDates);
            await db.eventAttendees.bulkPut(seedData.attendees);
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
