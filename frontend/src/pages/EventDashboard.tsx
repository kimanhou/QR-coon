import { useNavigate, useParams } from "react-router-dom";
import { db } from "db";
import { useLiveQuery } from "dexie-react-hooks";
import Scanner from "pages/Scanner";
import ParticipantList from "pages/ParticipantList";
import NaughtyList from "pages/NaughtyList";

const EventDashboard = () => {
  const navigate = useNavigate();
  const { eventId, tab } = useParams();
  const id = Number(eventId);
  const event = useLiveQuery(() => db.events.get(id), [id]);

  const missingCount = useLiveQuery(async () => {
    const attendees = await db.eventAttendees
      .where("eventId")
      .equals(id)
      .toArray();
    const scans = await db.scans.where("eventId").equals(id).toArray();

    const scannedIds = new Set(scans.map((s) => s.personId));
    // Filter out anyone who has a scan record
    const missing = attendees.filter((a) => !scannedIds.has(a.personId));

    return missing.length;
  }, [id]);

  if (!id) return <div className="p-strip">Invalid event ID</div>;
  if (!event) return <div className="p-strip">Loading session details...</div>;

  // Default to 'scanner' if the URL is just /events/:id
  const activeTab = tab || "scanner";

  const handleTabChange = (newTab: string) => {
    navigate(`/events/${id}/${newTab}`);
  };

  if (!id) return <div>Invalid event ID</div>;

  return (
    <div className="event-dashboard row">
      <button
        className="p-button--base u-no-margin"
        onClick={() => navigate("/events")}
      >
        ← Back to list
      </button>

      <div className="event-content">
        <p className="event-date u-no-margin u-text--muted">
          {event.date.toLocaleDateString(undefined, {
            weekday: "long",
            month: "short",
            day: "numeric",
          })}
        </p>
        <h4 className="event-session u-no-margin u-no-padding">
          {event.session}
        </h4>
        <span className="p-text--small-caps">
          {event.sprint} Sprint • {event.location}
        </span>
      </div>

      <nav className="p-tabs">
        <ul className="p-tabs__list">
          <li className="p-tabs__item">
            <button
              className="p-tabs__link"
              onClick={() => handleTabChange("scanner")}
              aria-selected={activeTab === "scanner"}
            >
              Scanner
            </button>
          </li>
          <li className="p-tabs__item">
            <button
              className="p-tabs__link"
              onClick={() => handleTabChange("participants")}
              aria-selected={activeTab === "participants"}
            >
              Attendees
            </button>
          </li>
          <li className="p-tabs__item">
            <button
              className="p-tabs__link"
              onClick={() => handleTabChange("naughty")}
              aria-selected={activeTab === "naughty"}
            >
              Naughty list{" "}
              {missingCount !== undefined ? `(${missingCount})` : ""}
            </button>
          </li>
        </ul>
      </nav>

      {activeTab === "scanner" && <Scanner currentEventId={id} />}
      {activeTab === "participants" && <ParticipantList eventId={id} />}
      {activeTab === "naughty" && <NaughtyList activeEventId={id} />}
    </div>
  );
};

export default EventDashboard;
