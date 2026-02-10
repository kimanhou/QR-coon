import { useState, type FC } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";
import { Icon } from "@canonical/react-components";
import ManualCheckInButton from "../components/ManualCheckInButton";

interface Props {
  eventId: number;
}

const ParticipantList: FC<Props> = ({ eventId }) => {
  const [searchTerm, setSearchTerm] = useState("");

  const data = useLiveQuery(async () => {
    const attendeeLinks = await db.eventAttendees
      .where("eventId")
      .equals(eventId)
      .toArray();

    const personIds = attendeeLinks.map((link) => link.personId);
    const people = await db.people.bulkGet(personIds);

    const scans = await db.scans.where("eventId").equals(eventId).toArray();
    const scanMap = new Map(scans.map((s) => [s.personId, s]));

    const participantsWithStatus = people
      .filter((p): p is NonNullable<typeof p> => !!p)
      .map((p) => {
        const scan = scanMap.get(p.id);
        return {
          ...p,
          hasCheckedIn: !!scan,
          checkInTime: scan?.timestamp,
          checkInMethod: scan?.method || "scan",
        };
      });

    return participantsWithStatus.filter((p) => {
      const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
      return (
        fullName.includes(searchTerm.toLowerCase()) ||
        p.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [eventId, searchTerm]);

  const handleManualCheckIn = async (personId: string) => {
    try {
      await db.scans.add({
        id: crypto.randomUUID(),
        eventId: eventId,
        personId: personId,
        // eslint-disable-next-line react-hooks/purity
        timestamp: Date.now(),
        method: "manual",
        uploaded: false,
      });
      // useLiveQuery will automatically refresh the UI
    } catch (err) {
      console.error("Manual check-in failed", err);
    }
  };

  return (
    <div className="participant-list row">
      <div className="col-12">
        <div className="p-search-box u-sv3">
          <input
            type="search"
            className="p-search-box__input"
            placeholder="Filter event attendees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <table className="p-table--mobile-card">
          <thead>
            <tr>
              <th>Attendee Name</th>
              <th className="u-align--center">Status</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((p) => (
              <tr key={p.id}>
                <td data-label="Name" className="name u-flex u-space-between">
                  <div className="name-email">
                    <strong>
                      {p.firstName} {p.lastName}
                    </strong>
                    <br />
                    <small className="u-text--muted">{p.email}</small>
                  </div>

                  {!p.hasCheckedIn && (
                    <ManualCheckInButton
                      confirmingPerson={p}
                      onCheckIn={handleManualCheckIn}
                    />
                  )}
                </td>
                <td data-label="Status" className="u-align--center">
                  {p.hasCheckedIn ? (
                    <span>
                      <Icon name="status-succeeded-small" />{" "}
                      {p.checkInMethod === "manual"
                        ? "Manual checked-in"
                        : "Checked-in"}{" "}
                      <br />
                      {p.checkInTime && (
                        <span
                          className="u-text--muted p-text--small"
                          style={{ marginLeft: "8px" }}
                        >
                          on{" "}
                          {new Date(p.checkInTime).toLocaleDateString([], {
                            weekday: "long",
                            month: "short",
                            day: "numeric",
                          })}{" "}
                          at{" "}
                          {new Date(p.checkInTime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span>
                      <Icon name="status-waiting-small" /> Pending
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {data?.length === 0 && (
          <p className="p-text--caution">No attendees found for this event.</p>
        )}
      </div>
    </div>
  );
};

export default ParticipantList;
