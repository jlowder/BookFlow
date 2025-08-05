import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertBookSchema, insertReadingSessionSchema } from "@shared/schema";
import { z } from "zod";
import { parse } from "csv-parse";
import { stringify } from "csv-stringify";

const colors = [
  "#EC4899", // pink
  "#10B981", // green
  "#8B5CF6", // purple
  "#3B82F6", // blue
  "#F59E0B", // amber
  "#06B6D4", // cyan
  "#EF4444", // red
  "#84CC16", // lime
  "#F97316", // orange
  "#8B5A3C", // brown
  "#6366F1", // indigo
  "#D946EF", // fuchsia
];

async function getUniqueColor() {
  // Get all existing books to check their colors
  const existingBooks = await storage.getBooks();
  const usedColors = existingBooks.map(book => book.color);
  
  // Find available colors that aren't currently in use
  const availableColors = colors.filter(color => !usedColors.includes(color));
  
  // If we have available colors, use one of them
  if (availableColors.length > 0) {
    return availableColors[Math.floor(Math.random() * availableColors.length)];
  }
  
  // If all colors are used, fall back to random selection
  // This handles cases where there are more books than available colors
  return colors[Math.floor(Math.random() * colors.length)];
}

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
        color: await getUniqueColor()
      });
      
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

  // Delete a reading session
  app.delete("/api/reading-sessions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteReadingSession(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Reading session not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete reading session" });
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

  // Export data to CSV
  app.get("/api/export/csv", async (req, res) => {
    try {
      const [books, sessions] = await Promise.all([
        storage.getBooks(),
        storage.getAllReadingSessions()
      ]);

      // Prepare CSV data with both books and sessions
      const csvData = [];
      
      // Add header row
      csvData.push([
        'Type', 'BookId', 'Title', 'Author', 'Color', 'CoverUrl', 'TotalPages', 
        'CurrentPage', 'Status', 'StartDate', 'CompletedDate', 'Notes',
        'SessionId', 'SessionDate', 'PagesRead', 'Duration', 'SessionNotes'
      ]);

      // Add books with their sessions
      for (const book of books) {
        const bookSessions = sessions.filter(s => s.bookId === book.id);
        
        if (bookSessions.length > 0) {
          // Book with sessions
          for (const session of bookSessions) {
            csvData.push([
              'book_with_session', book.id, book.title, book.author, book.color,
              book.coverUrl || '', book.totalPages || '', book.currentPage || '',
              book.status, book.startDate || '', book.completedDate || '', book.notes || '',
              session.id, session.date, session.pagesRead || '', session.duration || '', session.notes || ''
            ]);
          }
        } else {
          // Book without sessions
          csvData.push([
            'book_only', book.id, book.title, book.author, book.color,
            book.coverUrl || '', book.totalPages || '', book.currentPage || '',
            book.status, book.startDate || '', book.completedDate || '', book.notes || '',
            '', '', '', '', ''
          ]);
        }
      }

      // Convert to CSV string
      stringify(csvData, (err, output) => {
        if (err) {
          return res.status(500).json({ error: "Failed to generate CSV" });
        }
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="reading_journal_backup.csv"');
        res.send(output);
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to export data" });
    }
  });

  // Import data from CSV
  app.post("/api/import/csv", async (req, res) => {
    try {
      const csvData = req.body.csvData;
      if (!csvData) {
        return res.status(400).json({ error: "CSV data is required" });
      }

      const results = { 
        books: { created: 0, updated: 0, errors: 0 },
        sessions: { created: 0, errors: 0 }
      };

      // Parse CSV
      parse(csvData, {
        columns: true,
        skip_empty_lines: true
      }, async (err, records) => {
        if (err) {
          return res.status(400).json({ error: "Invalid CSV format" });
        }

        try {
          const processedBooks = new Map();
          
          // Process records
          for (const record of records as any[]) {
            const type = record.Type;
            const bookId = parseInt(record.BookId);
            
            // Process book data if not already processed
            if (!processedBooks.has(bookId)) {
              try {
                const bookData = {
                  title: record.Title,
                  author: record.Author,
                  color: record.Color,
                  coverUrl: record.CoverUrl || null,
                  totalPages: record.TotalPages ? parseInt(record.TotalPages) : null,
                  currentPage: record.CurrentPage ? parseInt(record.CurrentPage) : null,
                  status: record.Status as "reading" | "completed" | "paused",
                  startDate: record.StartDate || null,
                  completedDate: record.CompletedDate || null,
                  notes: record.Notes || null
                };

                // Check if book already exists
                const existingBooks = await storage.getBooks();
                const existingBook = existingBooks.find(b => 
                  b.title === bookData.title && b.author === bookData.author
                );

                if (existingBook) {
                  // Update existing book
                  await storage.updateBook(existingBook.id, bookData);
                  processedBooks.set(bookId, existingBook.id);
                  results.books.updated++;
                } else {
                  // Create new book
                  const newBook = await storage.createBook(bookData);
                  processedBooks.set(bookId, newBook.id);
                  results.books.created++;
                }
              } catch (error) {
                console.error('Error processing book:', error);
                results.books.errors++;
              }
            }

            // Process session data if present
            if (type === 'book_with_session' && record.SessionDate) {
              try {
                const realBookId = processedBooks.get(bookId);
                if (realBookId) {
                  const sessionData = {
                    bookId: realBookId,
                    date: record.SessionDate,
                    pagesRead: record.PagesRead ? parseInt(record.PagesRead) : null,
                    duration: record.Duration ? parseInt(record.Duration) : null,
                    notes: record.SessionNotes || null
                  };

                  // Check if session already exists
                  const existingSessions = await storage.getAllReadingSessions();
                  const existingSession = existingSessions.find(s => 
                    s.bookId === realBookId && s.date === sessionData.date
                  );

                  if (!existingSession) {
                    await storage.createReadingSession(sessionData);
                    results.sessions.created++;
                  }
                }
              } catch (error) {
                console.error('Error processing session:', error);
                results.sessions.errors++;
              }
            }
          }

          res.json({ 
            message: "Import completed", 
            results 
          });
        } catch (error) {
          console.error('Import error:', error);
          res.status(500).json({ error: "Failed to import data" });
        }
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to process import" });
    }
  });

  // Clear all data endpoint
  app.delete("/api/clear-all-data", async (req, res) => {
    try {
      // Get current counts before clearing
      const [books, sessions] = await Promise.all([
        storage.getBooks(),
        storage.getAllReadingSessions()
      ]);
      
      const bookCount = books.length;
      const sessionCount = sessions.length;
      
      // Clear all data
      await storage.clearAllData();
      
      res.json({
        message: "All data cleared successfully",
        deleted: {
          books: bookCount,
          sessions: sessionCount
        }
      });
    } catch (error) {
      console.error("Error clearing all data:", error);
      res.status(500).json({ error: "Failed to clear data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
