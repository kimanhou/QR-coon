importScripts("./dexie.js");

// Initialize a separate DB instance with the SAME name
const db = new Dexie("QRCoonDB");
db.version(4).stores({
  scans:
    "id, eventId, personId, [eventId+personId], timestamp, method, uploaded",
});

const SYNC_TAG = "upload-scans";

self.addEventListener("periodicsync", (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(uploadPendingScans());
  }
});

async function uploadPendingScans() {
  const pendingScans = await db.scans
    .toCollection()
    .filter((scan) => scan.uploaded === false)
    .toArray();

  if (pendingScans.length === 0) return;

  for (const scan of pendingScans) {
    try {
      const BACKEND_URL = "http://localhost:5000/scans";
      const response = await fetch(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: scan.id,
          event_id: scan.eventId,
          person_id: scan.personId,
          timestamp: scan.timestamp,
          method: scan.method,
        }),
      });

      if (response.ok) {
        await db.scans.update(scan.id, { uploaded: true });
      }
    } catch (err) {
      console.error("Sync failed for scan:", scan.id, err);
    }
  }
}
