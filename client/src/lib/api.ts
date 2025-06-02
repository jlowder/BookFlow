import { apiRequest } from "./queryClient";
import type { Book, InsertBook, ReadingSession, InsertReadingSession } from "@shared/schema";

export const booksApi = {
  getAll: (): Promise<Book[]> => 
    fetch("/api/books", { credentials: "include" }).then(res => res.json()),
    
  getByStatus: (status: "reading" | "completed" | "paused"): Promise<Book[]> =>
    fetch(`/api/books/status/${status}`, { credentials: "include" }).then(res => res.json()),
    
  create: (book: InsertBook): Promise<Book> =>
    apiRequest("POST", "/api/books", book).then(res => res.json()),
    
  update: (id: number, updates: Partial<Book>): Promise<Book> =>
    apiRequest("PATCH", `/api/books/${id}`, updates).then(res => res.json()),
    
  delete: (id: number): Promise<void> =>
    apiRequest("DELETE", `/api/books/${id}`).then(() => {}),
    
  search: (query: string) =>
    fetch(`/api/books/search?q=${encodeURIComponent(query)}`, { credentials: "include" }).then(res => res.json()),
};

export const sessionsApi = {
  create: (session: InsertReadingSession): Promise<ReadingSession> =>
    apiRequest("POST", "/api/reading-sessions", session).then(res => res.json()),
    
  getForBook: (bookId: number): Promise<ReadingSession[]> =>
    fetch(`/api/books/${bookId}/sessions`, { credentials: "include" }).then(res => res.json()),
    
  getInRange: (startDate: string, endDate: string): Promise<ReadingSession[]> =>
    fetch(`/api/reading-sessions?startDate=${startDate}&endDate=${endDate}`, { credentials: "include" }).then(res => res.json()),
    
  getByDate: (date: string): Promise<ReadingSession[]> =>
    fetch(`/api/reading-sessions?date=${date}`, { credentials: "include" }).then(res => res.json()),
};

export const statsApi = {
  get: () =>
    fetch("/api/stats", { credentials: "include" }).then(res => res.json()),
};
