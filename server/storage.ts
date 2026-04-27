import { books, readingSessions, type Book, type InsertBook, type ReadingSession, type InsertReadingSession } from "@shared/schema";
import { toLocalDateString, parseLocalDate } from "./date-utils";
import { SQLiteStorage } from "./database";

export interface IStorage {
  // Book operations
  getBooks(): Promise<Book[]>;
  getBook(id: number): Promise<Book | undefined>;
  getBooksByStatus(status: "reading" | "completed" | "paused"): Promise<Book[]>;
  getCompletedBooksInRange: (startDate: string, endDate: string) => Promise<Book[]>;
  createBook(book: InsertBook): Promise<Book>;
  updateBook(id: number, updates: Partial<Book>): Promise<Book | undefined>;
  deleteBook(id: number): Promise<boolean>;
  
  // Reading session operations
  getAllReadingSessions(): Promise<ReadingSession[]>;
  getReadingSessions(bookId: number): Promise<ReadingSession[]>;
  getReadingSessionsByDate(date: string): Promise<ReadingSession[]>;
  getReadingSessionsInRange(startDate: string, endDate: string): Promise<ReadingSession[]>;
  createReadingSession(session: InsertReadingSession): Promise<ReadingSession>;
  deleteReadingSession(id: number): Promise<boolean>;
  
  // Statistics
  getReadingStreak(today: string): Promise<number>;
  getTotalBooksRead(): Promise<number>;
  getAveragePagesPerDay(today: string): Promise<number>;
  getTotalPagesRead(): Promise<number>;
  getPagesRemainingInCurrentlyReading(): Promise<number>;
  
  // Data management
  clearAllData(): Promise<void>;
}

export class MemStorage implements IStorage {
  private books: Map<number, Book>;
  private readingSessions: Map<number, ReadingSession>;
  private currentBookId: number;
  private currentSessionId: number;

  constructor() {
    this.books = new Map();
    this.readingSessions = new Map();
    this.currentBookId = 1;
    this.currentSessionId = 1;
  }

  async getBooks(): Promise<Book[]> {
    return Array.from(this.books.values());
  }

  async getBook(id: number): Promise<Book | undefined> {
    return this.books.get(id);
  }

  async getBooksByStatus(status: "reading" | "completed" | "paused"): Promise<Book[]> {
    return Array.from(this.books.values()).filter(book => book.status === status);
  }

  async createBook(insertBook: InsertBook): Promise<Book> {
    const id = this.currentBookId++;
    // Use provided startDate if available, otherwise fall back to UTC date
    const startDate = insertBook.startDate || new Date().toISOString().split('T')[0];
    const book: Book = { 
      id,
      title: insertBook.title,
      author: insertBook.author,
      color: insertBook.color,
      coverUrl: insertBook.coverUrl || null,
      totalPages: insertBook.totalPages || null,
      currentPage: insertBook.currentPage || null,
      status: insertBook.status || "reading",
      startDate: startDate,
      completedDate: null,
      notes: insertBook.notes || null
    };
    this.books.set(id, book);
    return book;
  }

  async updateBook(id: number, updates: Partial<Book>): Promise<Book | undefined> {
    const book = this.books.get(id);
    if (!book) return undefined;
    
    const updatedBook = { ...book, ...updates };
    if (updates.status === "completed" && !book.completedDate) {
      updatedBook.completedDate = new Date().toISOString().split('T')[0];
    }
    
    this.books.set(id, updatedBook);
    return updatedBook;
  }

  async deleteBook(id: number): Promise<boolean> {
    return this.books.delete(id);
  }

  async getAllReadingSessions(): Promise<ReadingSession[]> {
    return Array.from(this.readingSessions.values());
  }

  async getReadingSessions(bookId: number): Promise<ReadingSession[]> {
    return Array.from(this.readingSessions.values()).filter(session => session.bookId === bookId);
  }

  async getReadingSessionsByDate(date: string): Promise<ReadingSession[]> {
    return Array.from(this.readingSessions.values()).filter(session => session.date === date);
  }

  async getReadingSessionsInRange(startDate: string, endDate: string): Promise<ReadingSession[]> {
    return Array.from(this.readingSessions.values()).filter(session => 
      session.date >= startDate && session.date <= endDate
    );
  }

  async createReadingSession(insertSession: InsertReadingSession): Promise<ReadingSession> {
    const id = this.currentSessionId++;
    const session: ReadingSession = { 
      id,
      bookId: insertSession.bookId,
      date: insertSession.date,
      pagesRead: insertSession.pagesRead || null,
      duration: insertSession.duration || null,
      notes: insertSession.notes || null
    };
    this.readingSessions.set(id, session);
    return session;
  }

  async deleteReadingSession(id: number): Promise<boolean> {
    return this.readingSessions.delete(id);
  }

  async getReadingStreak(today: string): Promise<number> {
    const sessions = Array.from(this.readingSessions.values());
    const dates = new Set(sessions.map(s => s.date));

    if (dates.size === 0) {
      return 0;
    }
    
    let currentDate = today;
    if (!dates.has(currentDate)) {
      return 0;
    }

    let streak = 0;
    // Loop backwards from the current date to calculate the streak
    while (dates.has(currentDate)) {
      streak++;
      const prevDate = parseLocalDate(currentDate);
      prevDate.setDate(prevDate.getDate() - 1);
      currentDate = toLocalDateString(prevDate);
    }

    return streak;
  }

  async getTotalBooksRead(): Promise<number> {
    return Array.from(this.books.values()).filter(book => book.status === "completed").length;
  }

  async getAveragePagesPerDay(today: string): Promise<number> {
    const sessions = Array.from(this.readingSessions.values());
    const completedBooks = Array.from(this.books.values()).filter(book => book.status === "completed");
    
    if (completedBooks.length === 0 || sessions.length === 0) {
      return 0;
    }
    
    // Get the date of the first completed book
    const completedDates = completedBooks
      .map(book => book.completedDate)
      .filter(date => date !== null && date !== undefined) as string[];
    
    if (completedDates.length === 0) {
      return 0;
    }
    
    const firstCompletedDate = completedDates.reduce((earliest, current) => 
      current < earliest ? current : earliest
    );
    
    // Calculate days between first completed book and today
    const firstDate = parseLocalDate(firstCompletedDate);
    const todayDate = parseLocalDate(today);
    const diffTime = Math.abs(todayDate.getTime() - firstDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 0;
    }
    
    // Calculate total pages read from completed books
    const totalPages = completedBooks.reduce((sum, book) => 
      sum + (book.totalPages || 0), 0
    );
    
    return Math.round((totalPages / diffDays) * 100) / 100;
  }

  async getTotalPagesRead(): Promise<number> {
    const completedBooks = Array.from(this.books.values()).filter(book => book.status === "completed");
    return completedBooks.reduce((sum, book) => sum + (book.totalPages || 0), 0);
  }

  async getPagesRemainingInCurrentlyReading(): Promise<number> {
    const readingBooks = Array.from(this.books.values()).filter(book => book.status === "reading");
    return readingBooks.reduce((sum, book) => 
      sum + ((book.totalPages || 0) - (book.currentPage || 0)), 0
    );
  }

  async clearAllData(): Promise<void> {
    this.books.clear();
    this.readingSessions.clear();
    this.currentBookId = 1;
    this.currentSessionId = 1;
  }
}

export const storage = new SQLiteStorage();
