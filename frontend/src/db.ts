import Dexie from "dexie";
import type { Table } from "dexie";

export interface Person {
  id: string;
  firstName: string;
  lastName: string;
  directManager: string;
  email: string;
}

export interface Event {
  id?: number;
  location: string;
  sprint: string;
  date: Date;
  session: string;
}

export interface EventAttendee {
  id?: number;
  eventId: number;
  personId: string;
}

export interface Scan {
  id: string;
  eventId: number;
  personId: string;
  timestamp: number; // Unix timestamp
  method: string;
}

export class QRCoonDB extends Dexie {
  events!: Table<Event>;
  eventAttendees!: Table<EventAttendee>;
  scans!: Table<Scan>;
  people!: Table<Person>;

  constructor() {
    super("QRCoonDB");
    this.version(1).stores({
      events: "++id, sprint, date, session",
      eventAttendees: "++id, eventId, personId",
      scans: "id, eventId, personId, [eventId+personId], timestamp, method",
      people: "id, firstName, lastName, email, directManager",
    });
  }
}

export const db = new QRCoonDB();
