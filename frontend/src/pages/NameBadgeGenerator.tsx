import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { QRCodeSVG } from "qrcode.react";
import { db } from "db";
import { Button } from "@canonical/react-components";

const NameBadgeGenerator = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, 300);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  const results = useLiveQuery(async () => {
    if (debouncedTerm.length < 2) return [];

    const people = await db.people
      .filter((p) => {
        const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
        return fullName.includes(debouncedTerm.toLowerCase());
      })
      .toArray();

    const peopleWithSprints = await Promise.all(
      people.map(async (p) => {
        const attendeeLinks = await db.eventAttendees
          .where("personId")
          .equals(p.id)
          .toArray();

        const eventIds = attendeeLinks.map((l) => l.eventId);
        const events = await db.events.bulkGet(eventIds);

        const uniqueSprints = Array.from(
          new Map(events.map((e) => [e?.sprint, e])).values(),
        ).filter((e): e is NonNullable<typeof e> => !!e);

        return { ...p, sprints: uniqueSprints };
      }),
    );

    return peopleWithSprints;
  }, [debouncedTerm]);

  const handlePrint = () => window.print();

  return (
    <div className="p-strip">
      <div className="row u-no-print">
        <div className="col-12">
          <h2 className="p-heading--3 u-text-align--center">
            QR code generator
          </h2>
          <div className="p-search-box u-sv3">
            <input
              type="search"
              className="p-search-box__input"
              placeholder="Enter participant name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {results && results.length > 0 && (
            <Button appearance="positive" onClick={handlePrint}>
              Print
            </Button>
          )}
        </div>
      </div>

      <div className="badge-grid is-light">
        {results?.map((person) =>
          person.sprints.map((sprintEvent) => (
            <div
              key={`${person.id}-${sprintEvent.sprint}`}
              className="badge-card p-card"
            >
              <div className="badge-header">
                <span className="p-text--small-caps">
                  {sprintEvent.sprint} • {sprintEvent.location} 2026
                </span>
              </div>
              <div className="badge-body">
                <h3 className="p-heading--4 u-no-margin">
                  {person.firstName} {person.lastName}
                </h3>
                <p className="p-text--small">{person.email}</p>
                <div className="qr-container">
                  <QRCodeSVG
                    value={`${person.id}|${sprintEvent.location}|${sprintEvent.sprint}`}
                    size={120}
                    level="H"
                  />
                </div>
              </div>
            </div>
          )),
        )}
      </div>

      {debouncedTerm.length >= 2 && results?.length === 0 && (
        <p className="p-text--caution">
          No participants found matching "{debouncedTerm}"
        </p>
      )}
    </div>
  );
};

export default NameBadgeGenerator;
