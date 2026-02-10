import express from "express";
import { Pool } from "pg";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

app.get("/", (req, res) => {
  res.json({ message: "Backend is running!" });
});

app.get("/db-check", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ status: "Connected to database", time: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get("/events", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM events");
    res.json({
      status: "Connected to database",
      count: result.rows.length,
      rows: result.rows,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get("/people", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM people");
    res.json({
      status: "Connected to database",
      count: result.rows.length,
      rows: result.rows,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get("/event_attendees", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM event_attendees");
    res.json({
      status: "Connected to database",
      count: result.rows.length,
      rows: result.rows,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get("/scans", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM scans");
    res.json({
      status: "Connected to database",
      count: result.rows.length,
      rows: result.rows,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post("/scans", async (req, res) => {
  const { id, event_id, person_id, timestamp, method } = req.body;

  if (!event_id || !person_id) {
    return res
      .status(400)
      .json({ error: "event_id and person_id are required" });
  }

  try {
    const query = `
      INSERT INTO scans (id, event_id, person_id, timestamp, method)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const values = [id, event_id, person_id, timestamp, method];
    const result = await pool.query(query, values);

    res.status(201).json({
      message: "Scan recorded successfully",
      scan: result.rows[0],
    });
  } catch (err) {
    console.error("Error inserting scan:", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
