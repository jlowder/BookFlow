import Database from 'better-sqlite3';
import { join } from 'path';
import type { Book, InsertBook, ReadingSession, InsertReadingSession } from "@shared/schema";
import type { IStorage } from './storage';

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
        notes TEXT
      )
    `);

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

  async createBook(insertBook: InsertBook): Promise<Book> {
    const now = new Date().toISOString().split('T')[0];
    const stmt = this.db.prepare(`
      INSERT INTO books (title, author, color, coverUrl, totalPages, currentPage, status, startDate, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      insertBook.title,
      insertBook.author,
      insertBook.color,
      insertBook.coverUrl || null,
      insertBook.totalPages || null,
      insertBook.currentPage || null,
      insertBook.status || 'reading',
      now,
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
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (updates.status === "completed" && !book.completedDate) {
      fields.push('completedDate = ?');
      values.push(new Date().toISOString().split('T')[0]);
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
    console.log(`[SQLiteStorage] Getting sessions in range: ${startDate} to ${endDate}`);
    const stmt = this.db.prepare('SELECT * FROM reading_sessions WHERE date >= ? AND date <= ? ORDER BY date');
    const sessions = stmt.all(startDate, endDate) as ReadingSession[];
    console.log(`[SQLiteStorage] Found ${sessions.length} sessions:`, sessions.map(s => `${s.id}: ${s.date}`));
    return sessions;
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

  async getReadingStreak(): Promise<number> {
    const stmt = this.db.prepare('SELECT DISTINCT date FROM reading_sessions ORDER BY date DESC');
    const dates = stmt.all() as { date: string }[];
    
    let streak = 0;
    // Use UTC date for consistency with database storage
    const today = new Date().toISOString().split('T')[0];
    let currentDate = today;
    
    console.log(`[SQLiteStorage] Calculating streak. Today: ${today}, Available dates:`, dates.map(d => d.date));
    
    for (const { date } of dates) {
      if (date === currentDate) {
        streak++;
        console.log(`[SQLiteStorage] Found reading session for ${date}, streak now: ${streak}`);
        // Calculate previous date
        const prevDate = new Date(currentDate + 'T00:00:00');
        prevDate.setDate(prevDate.getDate() - 1);
        currentDate = prevDate.toISOString().split('T')[0];
      } else {
        console.log(`[SQLiteStorage] No reading session for ${currentDate}, breaking streak at ${streak}`);
        break;
      }
    }
    
    console.log(`[SQLiteStorage] Final streak: ${streak}`);
    return streak;
  }

  async getTotalBooksRead(): Promise<number> {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM books WHERE status = ?');
    const result = stmt.get('completed') as { count: number };
    return result.count;
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