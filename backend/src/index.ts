import express from "express";
import { Pool } from "pg";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// Connection configuration using the service name 'db' from docker-compose
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

app.get("/", (req, res) => {
  res.json({ message: "Backend is running!" });
});

app.get("/db-check", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ status: "Connected to Postgres", time: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
