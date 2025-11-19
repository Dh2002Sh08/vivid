// v.js
import express from "express";
import {
  scrapeVividEvents,
  scrapeVividSearch,
  scrapeProduction,
  scrapeTickets,
} from "../utils/scraper.js";

const router = express.Router();

// HEALTH CHECK
router.get("/health", (_, res) =>
  res.json({ ok: true, timestamp: new Date().toISOString() })
);

// REAL EVENTS (Homepage)
router.get("/events", async (req, res) => {
  try {
    const { limit = 12, sort = "date" } = req.query;
    const events = await scrapeVividEvents(Number(limit));

    if (sort === "date") {
      events.sort((a, b) => {
        if (!a.localeDate) return 1;
        if (!b.localeDate) return -1;
        return new Date(a.localeDate) - new Date(b.localeDate);
      });
    }

    res.json({ events });
  } catch (error) {
    console.error("Events route error:", error.message);
    res.status(500).json({ message: "Failed to load events" });
  }
});

// SEARCH (Works with HomePage search bar)
router.get("/search", async (req, res) => {
  const { q } = req.query;
  if (!q || typeof q !== "string") {
    return res.status(400).json({ message: "Query parameter 'q' is required" });
  }

  try {
    const events = await scrapeVividSearch(q.trim(), 12);
    res.json({ events });
  } catch (error) {
    console.error("Search route error:", error.message);
    res.status(500).json({ message: "Search failed" });
  }
});

// PRODUCTION PAGE (fetchProduction)
router.get("/production/:id", async (req, res) => {
  const { id } = req.params;
  if (!id || !/^\d+$/.test(id)) {
    return res.status(400).json({ message: "Invalid production ID" });
  }

  try {
    const production = await scrapeProduction(id);
    if (!production) {
      return res.status(404).json({ message: "Production not found" });
    }
    res.json(production);
  } catch (error) {
    console.error(`Production ${id} error:`, error.message);
    res.status(500).json({ message: "Failed to load production" });
  }
});

// TICKETS PAGE (fetchTickets)
router.get("/production/:id/tickets", async (req, res) => {
  const { id } = req.params;
  const { quantity = 1 } = req.query;

  if (!id || !/^\d+$/.test(id)) {
    return res.status(400).json({ message: "Invalid production ID" });
  }

  try {
    const tickets = await scrapeTickets(id, Number(quantity));
    res.json(tickets);
  } catch (error) {
    console.error(`Tickets ${id} error:`, error.message);
    res.status(500).json({ message: "Failed to load tickets" });
  }
});

export default router;