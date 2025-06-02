import { pgTable, text, serial, integer, boolean, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const books = pgTable("books", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  author: text("author").notNull(),
  coverUrl: text("cover_url"),
  totalPages: integer("total_pages"),
  currentPage: integer("current_page").default(0),
  status: text("status", { enum: ["reading", "completed", "paused"] }).default("reading"),
  color: text("color").notNull(), // Hex color for timeline visualization
  startDate: date("start_date"),
  completedDate: date("completed_date"),
  notes: text("notes"),
});

export const readingSessions = pgTable("reading_sessions", {
  id: serial("id").primaryKey(),
  bookId: integer("book_id").notNull().references(() => books.id),
  date: date("date").notNull(),
  pagesRead: integer("pages_read").default(0),
  duration: integer("duration"), // in minutes
  notes: text("notes"),
});

export const insertBookSchema = createInsertSchema(books).omit({
  id: true,
  startDate: true,
  completedDate: true,
});

export const insertReadingSessionSchema = createInsertSchema(readingSessions).omit({
  id: true,
});

export type InsertBook = z.infer<typeof insertBookSchema>;
export type Book = typeof books.$inferSelect;
export type InsertReadingSession = z.infer<typeof insertReadingSessionSchema>;
export type ReadingSession = typeof readingSessions.$inferSelect;

// Google Books API response type
export interface GoogleBook {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
    pageCount?: number;
    publishedDate?: string;
    categories?: string[];
    description?: string;
  };
}
