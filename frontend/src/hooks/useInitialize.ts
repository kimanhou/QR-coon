import { useState, useEffect } from "react";
import { db } from "db";
import { toCamel } from "utils/api";

const TABLES_TO_SEED = [
  { name: "people", endpoint: "people" },
  { name: "events", endpoint: "events" },
  { name: "eventAttendees", endpoint: "event_attendees" },
] as const;

export const useInitialize = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        for (const config of TABLES_TO_SEED) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const table = (db as any)[config.name];
          if (!table) continue;

          const count = await table.count();
          if (count === 0) {
            console.log(`QR-coon: Fetching ${config.endpoint}...`);
            const response = await fetch(
              `http://localhost:5000/${config.endpoint}`,
            );

            if (!response.ok)
              throw new Error(`Server error: ${response.status}`);

            const json = await response.json();
            let dataToSave = toCamel(json);

            if (config.name === "events") {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              dataToSave = dataToSave.map((e: any) => ({
                ...e,
                date: new Date(e.date),
              }));
            }

            await table.bulkPut(dataToSave);
            console.log(`QR-coon: Seeded ${config.name} successfully.`);
          }
        }
      } catch (err) {
        console.error("QR-coon: Bootstrap failed", err);
        setInitError(
          err instanceof Error ? err.message : "Initialization failed",
        );
      } finally {
        setIsInitializing(false);
      }
    };

    bootstrap();
  }, []);

  return { isInitializing, initError };
};
