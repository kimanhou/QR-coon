import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";

interface Props {
  activeEventId: number;
}

const NaughtyList = ({ activeEventId }: Props) => {
  const [searchTerm, setSearchTerm] = useState("");

  const missingPeople = useLiveQuery(async () => {
    // 1. Get everyone expected at this event
    const attendees = await db.eventAttendees
      .where("eventId")
      .equals(activeEventId)
      .toArray();
    const expectedIds = attendees.map((a) => a.personId);

    // 2. Get everyone who has already scanned
    const scans = await db.scans
      .where("eventId")
      .equals(activeEventId)
      .toArray();
    const scannedIds = new Set(scans.map((s) => s.personId));

    // 3. Subtract scanned from expected
    const naughtyIds = expectedIds.filter((id) => !scannedIds.has(id));

    // 4. Fetch the names from the Person table
    const people = await db.people.bulkGet(naughtyIds);

    // 5. Apply the search filter
    return people
      .filter((p): p is NonNullable<typeof p> => !!p)
      .filter((p) => {
        const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
        return (
          fullName.includes(searchTerm.toLowerCase()) ||
          p.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
  }, [activeEventId, searchTerm]);

  return (
    <div className="row">
      <div className="col-12">
        <div className="p-search-box u-sv3">
          <input
            type="search"
            className="p-search-box__input"
            placeholder="Search for missing people..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="p-list-step">
          {missingPeople?.map((p) => (
            <div key={p.id} className="u-sv1">
              <strong>
                {p.firstName} {p.lastName}
              </strong>
              <br />
              <small className="u-text--muted">{p.email}</small>
              {/* <button
                    className="p-button--base u-no-margin"
                    onClick={async () => {
                      // Manual Check-in logic
                      await db.scans.add({
                        eventId: activeEventId,
                        personId: p.id!,
                        timestamp: Date.now(),
                      });
                    }}
                  >
                    Check-in
                  </button> */}
            </div>
          ))}

          {missingPeople?.length === 0 && !searchTerm && (
            <div className="p-notification--positive">
              <p className="p-notification__response">
                Excellent! Everyone has been scanned.
              </p>
            </div>
          )}

          {missingPeople?.length === 0 && searchTerm && (
            <p className="p-text--caution">
              No missing people match "{searchTerm}".
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default NaughtyList;
