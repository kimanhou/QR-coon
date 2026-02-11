import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { useInitialize } from "hooks/useInitialize";
import Home from "pages/Home";
import EventList from "pages/EventList";
import EventDashboard from "pages/EventDashboard";
import NameBadgeGenerator from "pages/NameBadgeGenerator";
import {
  applyTheme,
  Button,
  Icon,
  loadTheme,
} from "@canonical/react-components";
import "sass/styles.scss";

const App = () => {
  const { isInitializing, initError } = useInitialize();

  useEffect(() => {
    const theme = loadTheme();
    applyTheme(theme);
  }, []);

  useEffect(() => {
    async function initSync() {
      if ("serviceWorker" in navigator) {
        try {
          await navigator.serviceWorker.register("/sw.js");
        } catch (err) {
          console.error("QR-coon: SW registration failed", err);
        }
      }
    }
    initSync();
  }, []);

  if (isInitializing) {
    return (
      <div className="loading-screen">
        <img src="/assets/logo.png" alt="QR-coon" className="logo" />
        <p className="p-heading--5">Waking up the raccoon...</p>
        <Icon name="spinner" className="u-animation--spin" />
      </div>
    );
  }

  if (initError) {
    return (
      <div className="row">
        <p>Error initializing: {initError}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
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
};

export default App;
