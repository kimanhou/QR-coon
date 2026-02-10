import { useNavigate, useSearchParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";
import { Button, Notification } from "@canonical/react-components";

type FilterType = "all" | "today" | "tomorrow";

const EventList = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = (searchParams.get("filter") as FilterType) || "all";

  const events = useLiveQuery(async () => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    const endOfTomorrow = new Date(startOfTomorrow);
    endOfTomorrow.setDate(endOfTomorrow.getDate() + 1);

    if (filter === "today") {
      return await db.events
        .where("date")
        .between(startOfToday, startOfTomorrow, true, false)
        .toArray();
    }

    if (filter === "tomorrow") {
      return await db.events
        .where("date")
        .between(startOfTomorrow, endOfTomorrow, true, false)
        .toArray();
    }

    // Default: Show all sorted by date
    return await db.events.orderBy("date").toArray();
  }, [filter]);

  const handleFilterChange = (newFilter: FilterType) => {
    if (newFilter === "all") {
      searchParams.delete("filter");
    } else {
      searchParams.set("filter", newFilter);
    }
    setSearchParams(searchParams);
  };

  return (
    <div className="event-list">
      <div className="row">
        <div className="col-12">
          <h2 className="p-heading--3 u-text-align--center">Events</h2>
          <div className="filter-buttons-container u-flex u-flex-justify-content-center">
            <Button
              appearance={filter === "all" ? "positive" : "default"}
              onClick={() => handleFilterChange("all")}
            >
              Show all
            </Button>
            <Button
              appearance={filter === "today" ? "positive" : "default"}
              onClick={() => handleFilterChange("today")}
            >
              Today
            </Button>
            <Button
              appearance={filter === "tomorrow" ? "positive" : "default"}
              onClick={() => handleFilterChange("tomorrow")}
            >
              Tomorrow
            </Button>
          </div>

          <div className="event-list-container">
            {events?.map((event) => (
              <div
                key={event.id}
                className="event"
                onClick={() => navigate(`/events/${event.id}`)}
              >
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
                <Button appearance="default">Start scanning</Button>
              </div>
            ))}

            {events?.length === 0 && (
              <Notification severity="information">
                No events found {filter !== "all" ? `for ${filter}` : ""}.
              </Notification>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventList;
