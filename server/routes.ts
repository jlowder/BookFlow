import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertBookSchema, insertReadingSessionSchema } from "@shared/schema";
import { z } from "zod";

const colors = [
  "#EC4899", // pink
  "#10B981", // green
  "#8B5CF6", // purple
  "#3B82F6", // blue
  "#F59E0B", // amber
  "#06B6D4", // cyan
  "#EF4444", // red
  "#84CC16", // lime
];

let colorIndex = 0;

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Get all books
  app.get("/api/books", async (req, res) => {
    try {
      const books = await storage.getBooks();
      res.json(books);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch books" });
    }
  });

  // Get books by status
  app.get("/api/books/status/:status", async (req, res) => {
    try {
      const status = req.params.status as "reading" | "completed" | "paused";
      if (!["reading", "completed", "paused"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      const books = await storage.getBooksByStatus(status);
      res.json(books);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch books" });
    }
  });

  // Create a new book
  app.post("/api/books", async (req, res) => {
    try {
      const bookData = insertBookSchema.parse({
        ...req.body,
        color: colors[colorIndex % colors.length]
      });
      colorIndex++;
      
      const book = await storage.createBook(bookData);
      res.status(201).json(book);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid book data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create book" });
    }
  });

  // Update a book
  app.patch("/api/books/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const book = await storage.updateBook(id, updates);
      if (!book) {
        return res.status(404).json({ error: "Book not found" });
      }
      
      res.json(book);
    } catch (error) {
      res.status(500).json({ error: "Failed to update book" });
    }
  });

  // Delete a book
  app.delete("/api/books/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteBook(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Book not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete book" });
    }
  });

  // Create a reading session
  app.post("/api/reading-sessions", async (req, res) => {
    try {
      const sessionData = insertReadingSessionSchema.parse(req.body);
      const session = await storage.createReadingSession(sessionData);
      res.status(201).json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid session data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create reading session" });
    }
  });

  // Get reading sessions for a book
  app.get("/api/books/:id/sessions", async (req, res) => {
    try {
      const bookId = parseInt(req.params.id);
      const sessions = await storage.getReadingSessions(bookId);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reading sessions" });
    }
  });

  // Get reading sessions in a date range
  app.get("/api/reading-sessions", async (req, res) => {
    try {
      const { startDate, endDate, date } = req.query;
      
      if (date) {
        const sessions = await storage.getReadingSessionsByDate(date as string);
        return res.json(sessions);
      }
      
      if (startDate && endDate) {
        const sessions = await storage.getReadingSessionsInRange(startDate as string, endDate as string);
        return res.json(sessions);
      }
      
      res.status(400).json({ error: "Either 'date' or both 'startDate' and 'endDate' are required" });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reading sessions" });
    }
  });

  // Get reading statistics
  app.get("/api/stats", async (req, res) => {
    try {
      const [streak, totalBooks] = await Promise.all([
        storage.getReadingStreak(),
        storage.getTotalBooksRead()
      ]);
      
      res.json({ streak, totalBooks });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch statistics" });
    }
  });

  // Search books using Google Books API
  app.get("/api/books/search", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q) {
        return res.status(400).json({ error: "Query parameter 'q' is required" });
      }

      const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q as string)}&maxResults=10`);
      const data = await response.json();
      
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to search books" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
