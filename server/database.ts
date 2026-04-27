import Database from 'better-sqlite3';
import { join } from 'path';
import type { Book, InsertBook, ReadingSession, InsertReadingSession } from "@shared/schema";
import type { IStorage } from './storage';
import { toLocalDateString, parseLocalDate } from "./date-utils";

// Helper function to parse partial date strings (e.g., "2023", "2023-05") as local dates
const parsePartialDate = (dateInput: string): Date | null => {
  const dateStr = String(dateInput).trim();
  
  // Try parsing YYYY format (year only)
  const yearRegex = /^\d{4}$/;
  if (yearRegex.test(dateStr)) {
    const year = Number(dateStr);
    // Handle years between 0-99 as 2000-2099 (consistent with Date constructor behavior)
    const normalizedYear = year < 100 ? 2000 + year : year;
    return new Date(normalizedYear, 0, 1); // January 1 of that year
  }
  
  // Try parsing YYYY-MM format (year and month)
  const yearMonthRegex = /^(\d{4})-(\d{2})$/;
  const yearMonthMatch = dateStr.match(yearMonthRegex);
  if (yearMonthMatch) {
    const [, yearStr, monthStr] = yearMonthMatch;
    const year = Number(yearStr);
    const month = Number(monthStr);
    
    // Validate month is in 01-12 range
    if (month < 1 || month > 12) {
      console.warn(`[parsePartialDate] Invalid month (${month}) in date string: "${dateStr}"`);
      return null;
    }
    
    // Handle years between 0-99 as 2000-2099 (consistent with Date constructor behavior)
    const normalizedYear = year < 100 ? 2000 + year : year;
    return new Date(normalizedYear, month - 1, 1); // First day of that month
  }
  
  // Try parsing YYYY-MM-DD format (year, month, and day)
  const yearMonthDayRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
  const yearMonthDayMatch = dateStr.match(yearMonthDayRegex);
  if (yearMonthDayMatch) {
    const [, yearStr, monthStr, dayStr] = yearMonthDayMatch;
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);
    
    // Validate month is in 01-12 range
    if (month < 1 || month > 12) {
      console.warn(`[parsePartialDate] Invalid month (${month}) in date string: "${dateStr}"`);
      return null;
    }
    
    // Validate day is in 01-31 range
    if (day < 1 || day > 31) {
      console.warn(`[parsePartialDate] Invalid day (${day}) in date string: "${dateStr}"`);
      return null;
    }
    
    // Handle years between 0-99 as 2000-2099 (consistent with Date constructor behavior)
    const normalizedYear = year < 100 ? 2000 + year : year;
    
    // Create date and validate it's a real date (handles edge cases like Feb 30)
    const testDate = new Date(normalizedYear, month - 1, day);
    if (
      testDate.getFullYear() !== normalizedYear ||
      testDate.getMonth() !== month - 1 ||
      testDate.getDate() !== day
    ) {
      console.warn(`[parsePartialDate] Invalid date components in string: "${dateStr}"`);
      return null;
    }
    
    return testDate;
  }
  
  return null;
};

// Helper function to validate and standardize date strings to YYYY-MM-DD format
const standardizeDateString = (dateInput: string | Date | null | undefined): string | null => {
  // Handle null/undefined
  if (dateInput === null || dateInput === undefined) {
    return null;
  }

  let dateObj: Date;

  // Handle Date objects
  if (dateInput instanceof Date) {
    dateObj = dateInput;
  } else {
    // Handle string values
    const dateStr = String(dateInput).trim();
    
    // Empty string
    if (!dateStr) {
      return null;
    }

    // Try parsing YYYY-MM-DD format first
    const ymdRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
    const ymdMatch = dateStr.match(ymdRegex);
    if (ymdMatch) {
      const [, year, month, day] = ymdMatch;
      const testDate = new Date(Number(year), Number(month) - 1, Number(day));
      
      // Validate the date is real (handles cases like 2024-02-30)
      if (
        testDate.getFullYear() === Number(year) &&
        testDate.getMonth() === Number(month) - 1 &&
        testDate.getDate() === Number(day)
      ) {
        return dateStr;
      }
    }
    
    // Try parsing partial dates (YYYY or YYYY-MM) as local dates
    const partialDate = parsePartialDate(dateStr);
    if (partialDate) {
      return toLocalDateString(partialDate);
    }
    
    // Try parsing ISO format or other formats with Date constructor
    const parsedDate = new Date(dateStr);
    if (!isNaN(parsedDate.getTime())) {
      // Convert to YYYY-MM-DD format
      return toLocalDateString(parsedDate);
    }

    // Invalid date string
    console.warn(`[SQLiteStorage] Invalid date string: "${dateStr}"`);
    return null;
  }

  // Convert Date to YYYY-MM-DD format
  return toLocalDateString(dateObj);
};

export class SQLiteStorage implements IStorage {
  private db: Database.Database;

  constructor() {
    // Use external data directory for Docker persistence
    const dbPath = process.env.NODE_ENV === 'production' 
      ? '/app/data/reading_journal.db'
      : join(process.cwd(), 'reading_journal.db');
    
    try {
      console.log(`[SQLiteStorage] Attempting to open database at: ${dbPath}`);
      this.db = new Database(dbPath);
      console.log(`[SQLiteStorage] Database opened successfully`);
      this.initializeTables();
    } catch (error) {
      console.error(`[SQLiteStorage] Failed to open database at ${dbPath}:`, error);
      throw error;
    }
  }

  private initializeTables() {
    // Create books table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        coverUrl TEXT,
        totalPages INTEGER,
        currentPage INTEGER DEFAULT 0,
        status TEXT CHECK(status IN ('reading', 'completed', 'paused')) DEFAULT 'reading',
        color TEXT NOT NULL,
        startDate TEXT,
        completedDate TEXT,
        publicationDate TEXT,
        notes TEXT
      )
    `);
    try { this.db.exec("ALTER TABLE books ADD COLUMN publicationDate TEXT"); } catch (e) {} 

    // Create reading_sessions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS reading_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bookId INTEGER NOT NULL,
        date TEXT NOT NULL,
        pagesRead INTEGER DEFAULT 0,
        duration INTEGER,
        notes TEXT,
        FOREIGN KEY (bookId) REFERENCES books (id) ON DELETE CASCADE
      )
    `);
  }

  async getBooks(): Promise<Book[]> {
    const stmt = this.db.prepare('SELECT * FROM books ORDER BY id DESC');
    return stmt.all() as Book[];
  }

  async getBook(id: number): Promise<Book | undefined> {
    const stmt = this.db.prepare('SELECT * FROM books WHERE id = ?');
    return stmt.get(id) as Book | undefined;
  }

  async getBooksByStatus(status: "reading" | "completed" | "paused"): Promise<Book[]> {
    const stmt = this.db.prepare('SELECT * FROM books WHERE status = ? ORDER BY id DESC');
    return stmt.all(status) as Book[];
  }

  async getCompletedBooksInRange(startDate: string, endDate: string): Promise<Book[]> {
    const stmt = this.db.prepare('SELECT * FROM books WHERE status = ? AND completedDate >= ? AND completedDate <= ? ORDER BY completedDate DESC');
    return stmt.all('completed', startDate, endDate) as Book[];
  }

  async createBook(insertBook: InsertBook): Promise<Book> {
    // Validate and standardize dates
    const startDate = standardizeDateString(insertBook.startDate) || toLocalDateString(new Date());
    const completedDate = standardizeDateString(insertBook.completedDate);
    const publicationDate = standardizeDateString(insertBook.publicationDate);
    
    const stmt = this.db.prepare(`
      INSERT INTO books (title, author, color, coverUrl, totalPages, currentPage, status, startDate, completedDate, publicationDate, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      insertBook.title,
      insertBook.author,
      insertBook.color,
      insertBook.coverUrl || null,
      insertBook.totalPages || null,
      insertBook.currentPage || null,
      insertBook.status || 'reading',
      startDate,
      completedDate,
      publicationDate,
      insertBook.notes || null
    );

    const book = await this.getBook(result.lastInsertRowid as number);
    if (!book) throw new Error('Failed to create book');
    return book;
  }

  async updateBook(id: number, updates: Partial<Book>): Promise<Book | undefined> {
    const book = await this.getBook(id);
    if (!book) return undefined;

    const fields = [];
    const values = [];
    
    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id') {
        // Validate and standardize date fields
        const standardizedValue = key === 'publicationDate' || key === 'startDate' || key === 'completedDate'
          ? standardizeDateString(value)
          : value;
        fields.push(`${key} = ?`);
        values.push(standardizedValue);
      }
    }

    if (updates.status === "completed" && !book.completedDate) {
      fields.push('completedDate = ?');
      values.push(toLocalDateString(new Date()));
    }

    if (fields.length > 0) {
      values.push(id);
      const stmt = this.db.prepare(`UPDATE books SET ${fields.join(', ')} WHERE id = ?`);
      stmt.run(...values);
    }

    return await this.getBook(id);
  }

  async deleteBook(id: number): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM books WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  async getAllReadingSessions(): Promise<ReadingSession[]> {
    const stmt = this.db.prepare('SELECT * FROM reading_sessions ORDER BY date DESC');
    return stmt.all() as ReadingSession[];
  }

  async getReadingSessions(bookId: number): Promise<ReadingSession[]> {
    const stmt = this.db.prepare('SELECT * FROM reading_sessions WHERE bookId = ? ORDER BY date DESC');
    return stmt.all(bookId) as ReadingSession[];
  }

  async getReadingSessionsByDate(date: string): Promise<ReadingSession[]> {
    const stmt = this.db.prepare('SELECT * FROM reading_sessions WHERE date = ?');
    return stmt.all(date) as ReadingSession[];
  }

  async getReadingSessionsInRange(startDate: string, endDate: string): Promise<ReadingSession[]> {
    console.log(`[SQLiteStorage] getReadingSessionsInRange called with startDate=${startDate}, endDate=${endDate}`);
    const stmt = this.db.prepare('SELECT * FROM reading_sessions WHERE date >= ? AND date <= ? ORDER BY date');
    const results = stmt.all(startDate, endDate) as ReadingSession[];
    console.log(`[SQLiteStorage] Found ${results.length} sessions. Dates:`, results.map(s => s.date).slice(0, 10));
    return results;
  }

  async createReadingSession(insertSession: InsertReadingSession): Promise<ReadingSession> {
    try {
      console.log(`[SQLiteStorage] Creating reading session:`, insertSession);
      
      const stmt = this.db.prepare(`
        INSERT INTO reading_sessions (bookId, date, pagesRead, duration, notes)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        insertSession.bookId,
        insertSession.date,
        insertSession.pagesRead || null,
        insertSession.duration || null,
        insertSession.notes || null
      );

      console.log(`[SQLiteStorage] Insert result:`, result);

      const session = this.getReadingSession(result.lastInsertRowid as number);
      if (!session) {
        console.error(`[SQLiteStorage] Failed to retrieve created session with ID: ${result.lastInsertRowid}`);
        throw new Error('Failed to create reading session');
      }
      
      console.log(`[SQLiteStorage] Successfully created session:`, session);
      return session;
    } catch (error) {
      console.error(`[SQLiteStorage] Error creating reading session:`, error);
      throw error;
    }
  }

  async deleteReadingSession(id: number): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM reading_sessions WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  private getReadingSession(id: number): ReadingSession | undefined {
    const stmt = this.db.prepare('SELECT * FROM reading_sessions WHERE id = ?');
    return stmt.get(id) as ReadingSession | undefined;
  }

  async getReadingStreak(today: string): Promise<number> {
    const stmt = this.db.prepare('SELECT DISTINCT date FROM reading_sessions ORDER BY date DESC');
    const results = stmt.all() as { date: string }[];
    const dates = new Set(results.map(r => r.date));

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
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM books WHERE status = ?');
    const result = stmt.get('completed') as { count: number };
    return result.count;
  }

  async getAveragePagesPerDay(today: string): Promise<number> {
    // Get completed books
    const completedStmt = this.db.prepare('SELECT totalPages, completedDate FROM books WHERE status = ? AND totalPages IS NOT NULL AND completedDate IS NOT NULL');
    const completedBooks = completedStmt.all('completed') as { totalPages: number | null; completedDate: string }[];
    
    if (completedBooks.length === 0) {
      return 0;
    }
    
    // Get the earliest completed date
    let earliestDate = completedBooks[0].completedDate;
    for (const book of completedBooks) {
      if (book.completedDate < earliestDate) {
        earliestDate = book.completedDate;
      }
    }
    
    // Calculate days between earliest completed book and today
    const firstDate = parseLocalDate(earliestDate);
    const todayDate = parseLocalDate(today);
    const diffTime = Math.abs(todayDate.getTime() - firstDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 0;
    }
    
    // Calculate total pages read from completed books
    const totalPages = completedBooks.reduce((sum, book) => sum + (book.totalPages || 0), 0);
    
    return Math.round((totalPages / diffDays) * 100) / 100;
  }

  async getTotalPagesRead(): Promise<number> {
    const stmt = this.db.prepare('SELECT COALESCE(SUM(totalPages), 0) as total FROM books WHERE status = ?');
    const result = stmt.get('completed') as { total: number };
    return result.total;
  }

  async getPagesRemainingInCurrentlyReading(): Promise<number> {
    const stmt = this.db.prepare('SELECT totalPages, currentPage FROM books WHERE status = ?');
    const readingBooks = stmt.all('reading') as { totalPages: number | null; currentPage: number }[];
    
    return readingBooks.reduce((sum, book) => 
      sum + ((book.totalPages || 0) - (book.currentPage || 0)), 0
    );
  }

  async getAveragePagesPerBook(): Promise<number> {
    const stmt = this.db.prepare('SELECT AVG(totalPages) as avg FROM books WHERE status = ? AND totalPages IS NOT NULL');
    const result = stmt.get('completed') as { avg: number };
    return result.avg || 0;
  }

  async getBooksPerYear(today: string): Promise<number> {
    const avgPagesPerBook = await this.getAveragePagesPerBook();
    const avgPagesPerDay = await this.getAveragePagesPerDay(today);
    
    if (avgPagesPerDay === 0) {
      return 0;
    }
    
    // books per year = (avg pages per day * 365) / avg pages per book
    const booksPerYear = (avgPagesPerDay * 365) / avgPagesPerBook;
    return Math.round(booksPerYear * 10) / 10;
  }

  async clearAllData(): Promise<void> {
    console.log('[SQLiteStorage] Clearing all data...');
    
    // Clear all reading sessions first (due to foreign key constraints)
    const sessionsStmt = this.db.prepare('DELETE FROM reading_sessions');
    sessionsStmt.run();
    
    // Clear all books
    const booksStmt = this.db.prepare('DELETE FROM books');
    booksStmt.run();
    
    console.log('[SQLiteStorage] All data cleared successfully');
  }

  close() {
    this.db.close();
  }
}