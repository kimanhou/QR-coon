import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";
import { Notification, Button, Icon } from "@canonical/react-components";

interface Props {
  currentEventId: number;
}

const Scanner = ({ currentEventId }: Props) => {
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  const scanHistory = useLiveQuery(async () => {
    const recentScans = await db.scans
      .where("eventId")
      .equals(currentEventId)
      .filter((scan) => scan.method !== "manual" && scan.isLocal === true) // Do not display manual check-ins
      .reverse()
      .toArray();

    const sortedScans = recentScans
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5);

    const historyWithNames = await Promise.all(
      sortedScans.map(async (scan) => {
        const person = await db.people.get(scan.personId);
        return {
          ...scan,
          name: person ? `${person.firstName} ${person.lastName}` : "Unknown",
        };
      }),
    );
    return historyWithNames;
  }, [currentEventId]);

  const pendingCount = useLiveQuery(async () => {
    return await db.scans
      .toCollection()
      .filter((scan) => scan.uploaded === false && scan.isLocal === true)
      .count(); // This returns a Promise resolving to the number of matches
  }, []);

  const handleForceSync = async () => {
    setIsSyncing(true);

    const pendingScans = await db.scans
      .toCollection()
      .filter((scan) => scan.uploaded === false)
      .toArray();

    const lastSync =
      localStorage.getItem(`lastSync_${currentEventId}`) ||
      new Date(0).toISOString();

    try {
      const response = await fetch("http://localhost:5000/scans/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scans: pendingScans,
          last_sync: lastSync,
          event_id: currentEventId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const pushedIds = pendingScans.map((s) => s.id);
        await db.scans.where("id").anyOf(pushedIds).modify({ uploaded: true });
        const trulyNewScans = data.updates.filter(
          (remoteScan: any) => !pushedIds.includes(remoteScan.id),
        );

        for (const remoteScan of data.updates) {
          const existing = await db.scans.get(remoteScan.id);
          const isActuallyLocal = existing ? existing.isLocal : false;

          await db.scans.put({
            id: remoteScan.id,
            eventId: remoteScan.event_id,
            personId: remoteScan.person_id,
            timestamp: Number(remoteScan.timestamp),
            method: remoteScan.method,
            uploaded: true,
            isLocal: isActuallyLocal,
          });
        }

        localStorage.setItem(`lastSync_${currentEventId}`, data.server_time);

        setSyncMessage(
          `Synced! Pushed ${pendingScans.length} scan${pendingScans.length !== 1 ? "s" : ""}. Received ${trulyNewScans.length} update${trulyNewScans.length !== 1 ? "s" : ""}.`,
        );
      }
    } catch (err) {
      console.error("Batch sync failed:", err);
      setError("Sync failed. Check your connection.");
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncMessage(null), 3000);
    }
  };

  const startScanner = () => {
    setIsScanning(true);

    setTimeout(() => {
      if (scannerRef.current) return;

      const scanner = new Html5QrcodeScanner(
        "reader",
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        false,
      );

      async function onScanSuccess(decodedText: string) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const [personGuid, _, badgeSprint] = decodedText.split("|");
          const guidRegex =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

          if (!guidRegex.test(personGuid)) {
            setError(
              "Outdated badge: This badge uses an old format and must be reprinted.",
            );
            return;
          }
          const currentEvent = await db.events.get(currentEventId);

          if (currentEvent && badgeSprint !== currentEvent.sprint) {
            setError(`Wrong sprint: This is for ${badgeSprint}.`);
            return;
          }

          const person = await db.people.get(personGuid);
          if (!person) {
            setError("Access Denied: Attendee not found in system.");
            return;
          }

          const isInvited = await db.eventAttendees
            .where({ eventId: currentEventId, personId: personGuid })
            .first();

          if (!isInvited) {
            setError(
              `Access Denied: ${person.firstName} is not on the guest list for this event.`,
            );
            return;
          }

          if (person) {
            const fiveSecondsAgo = Date.now() - 5000;
            const recentScan = await db.scans
              .where("[eventId+personId]")
              .equals([currentEventId, person.id])
              .filter((s) => s.timestamp > fiveSecondsAgo)
              .first();

            if (recentScan) return;

            await db.scans.add({
              id: crypto.randomUUID(),
              eventId: currentEventId,
              personId: person.id,
              timestamp: Date.now(),
              method: "scan",
              uploaded: false,
              isLocal: true,
            });

            setLastScanned(`${person.firstName} ${person.lastName}`);
            setError(null);
            setTimeout(() => setLastScanned(null), 3000);
          } else {
            setError("Attendee not found in database.");
          }
        } catch (err) {
          setError(
            `Invalid QR code: ${err instanceof Error ? err.message : ""}`,
          );
        }
      }

      const readerElement = document.getElementById("reader");
      if (readerElement) {
        scanner.render(onScanSuccess, () => {});
        scannerRef.current = scanner;
      } else {
        console.error("Reader element still not found after timeout");
        setIsScanning(false);
      }
    }, 0);
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="row">
      <div className="col-12">
        {syncMessage && (
          <Notification
            severity="information"
            title="Sync Status"
            onDismiss={() => setSyncMessage(null)}
          >
            {syncMessage}
          </Notification>
        )}
        {lastScanned && (
          <Notification
            severity="positive"
            title="Scan successful"
            onDismiss={() => setLastScanned(null)}
          >
            {lastScanned} is checked-in !
          </Notification>
        )}
        {error && (
          <Notification
            severity="negative"
            title="Scan error"
            onDismiss={() => setError(null)}
          >
            {error}
          </Notification>
        )}

        <div className="scanner-container p-card u-sv3">
          {!isScanning ? (
            <div className="u-padding--top u-padding--bottom">
              <p>Ready to scan attendees</p>
              <Button
                appearance="positive"
                className="has-icon"
                onClick={startScanner}
              >
                <Icon name="snapshot" />
                <span>Open camera</span>
              </Button>
            </div>
          ) : (
            <div id="reader"></div>
          )}
        </div>

        <div className="p-card">
          <h4 className="p-heading--5">Recent scans</h4>
          <ul className="p-list">
            {scanHistory?.map((scan, index) => (
              <li key={index} className="p-list__item u-flex u-space-between">
                <span>{scan.name}</span>
                <span className="u-text--muted">
                  {scan.checkInTime}
                  {new Date(scan.timestamp).toLocaleDateString([], {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  at{" "}
                  {new Date(scan.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </li>
            ))}
            {(!scanHistory || scanHistory.length === 0) && (
              <li className="p-list__item u-text--muted">
                No scans recorded yet.
              </li>
            )}
          </ul>
        </div>

        {pendingCount > 0 && (
          <Button
            appearance="default"
            className="has-icon force-sync-button"
            onClick={handleForceSync}
            loading={isSyncing ? true : undefined}
            disabled={isSyncing}
          >
            <Icon name="upload" />
            <span>
              Force sync {pendingCount ?? 0} pending scan
              {pendingCount === 1 ? "" : "s"}
            </span>
          </Button>
        )}
      </div>
    </div>
  );
};

export default Scanner;
