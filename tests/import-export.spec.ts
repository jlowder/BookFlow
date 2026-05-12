import { test, expect } from '@playwright/test';

const API_URL = process.env.API_URL || 'http://localhost:5000/api';

test.describe('Data Import/Export', () => {
  test.beforeEach(async ({ request }) => {
    // Clear database before each test
    await request.delete(`${API_URL}/clear-all-data`);
  });

  test('should export and then import data correctly', async ({ request }) => {
    // 1. Create a book with special characters in notes
    const bookResponse = await request.post(`${API_URL}/books`, {
      data: {
        title: 'Import Export Test Book',
        author: 'Test Author',
        totalPages: 200,
        status: 'reading',
        color: '#00ff00',
        notes: 'Test notes with "quotes" and\nnew lines'
      },
    });
    expect(bookResponse.ok()).toBeTruthy();
    const book = await bookResponse.json();

    // 2. Create two reading sessions on the same day
    const session1Response = await request.post(`${API_URL}/reading-sessions`, {
      data: {
        bookId: book.id,
        date: '2025-05-20',
        pagesRead: 20,
        duration: 45,
        notes: 'Session 1 notes'
      },
    });
    expect(session1Response.ok()).toBeTruthy();

    const session2Response = await request.post(`${API_URL}/reading-sessions`, {
      data: {
        bookId: book.id,
        date: '2025-05-20',
        pagesRead: 15,
        duration: 30,
        notes: 'Session 2 notes'
      },
    });
    expect(session2Response.ok()).toBeTruthy();

    // 3. Export data
    const exportResponse = await request.get(`${API_URL}/export/csv`);
    expect(exportResponse.ok()).toBeTruthy();
    const csvData = await exportResponse.text();
    expect(csvData).toContain('Import Export Test Book');
    expect(csvData).toContain('Session 1 notes');
    expect(csvData).toContain('Session 2 notes');

    // 4. Clear data
    const clearResponse = await request.delete(`${API_URL}/clear-all-data`);
    expect(clearResponse.ok()).toBeTruthy();

    // Verify it's empty
    const booksEmptyResponse = await request.get(`${API_URL}/books`);
    const emptyBooks = await booksEmptyResponse.json();
    expect(emptyBooks.length).toBe(0);

    // 5. Import data
    const importResponse = await request.post(`${API_URL}/import/csv`, {
      data: {
        csvData: csvData
      }
    });
    expect(importResponse.ok()).toBeTruthy();
    const importResult = await importResponse.json();
    expect(importResult.results.books.created).toBe(1);
    expect(importResult.results.sessions.created).toBe(2);

    // 6. Verify restored data
    const booksResponse = await request.get(`${API_URL}/books`);
    const books = await booksResponse.json();
    expect(books.length).toBe(1);
    expect(books[0].title).toBe('Import Export Test Book');
    expect(books[0].author).toBe('Test Author');
    expect(books[0].notes).toBe('Test notes with "quotes" and\nnew lines');

    const sessionsResponse = await request.get(`${API_URL}/books/${books[0].id}/sessions`);
    const sessions = await sessionsResponse.json();
    expect(sessions.length).toBe(2);

    const notes = sessions.map(s => s.notes);
    expect(notes).toContain('Session 1 notes');
    expect(notes).toContain('Session 2 notes');
  });

  test('should handle larger CSV imports', async ({ request }) => {
    // Generate a larger CSV data
    let csvData = 'Type,BookId,Title,Author,Color,CoverUrl,TotalPages,CurrentPage,Status,StartDate,CompletedDate,PublicationDate,Notes,SessionId,SessionDate,PagesRead,Duration,SessionNotes\n';
    for (let i = 0; i < 200; i++) {
      csvData += `book_only,${i + 100},Large Import Book ${i},Test Author,#ffffff,,100,0,reading,2025-01-01,,,Some notes,,,0,0,\n`;
    }

    const importResponse = await request.post(`${API_URL}/import/csv`, {
      data: {
        csvData: csvData
      }
    });

    if (!importResponse.ok()) {
        const errorText = await importResponse.text();
        console.error('Import failed with status:', importResponse.status());
        console.error('Error body:', errorText);
    }

    expect(importResponse.ok()).toBeTruthy();
    const importResult = await importResponse.json();
    expect(importResult.results.books.created).toBe(200);
  });

  test('should handle duplicate books with different CSV IDs', async ({ request }) => {
    // Generate CSV data with same book title/author but different BookIds
    const csvData = [
        'Type,BookId,Title,Author,Color,CoverUrl,TotalPages,CurrentPage,Status,StartDate,CompletedDate,PublicationDate,Notes,SessionId,SessionDate,PagesRead,Duration,SessionNotes',
        'book_only,1,Duplicate Book,Author,#ffffff,,100,0,reading,2025-01-01,,,Notes 1,,,,,',
        'book_only,2,Duplicate Book,Author,#ffffff,,100,0,reading,2025-01-01,,,Notes 2,,,,,',
        'book_with_session,1,Duplicate Book,Author,#ffffff,,100,0,reading,2025-01-01,,,Notes 1,,2025-01-01,10,30,Session 1',
        'book_with_session,2,Duplicate Book,Author,#ffffff,,100,0,reading,2025-01-01,,,Notes 2,,2025-01-02,15,30,Session 2'
    ].join('\n');

    const importResponse = await request.post(`${API_URL}/import/csv`, {
      data: {
        csvData: csvData
      }
    });

    expect(importResponse.ok()).toBeTruthy();
    const importResult = await importResponse.json();

    // Should create 1 book and update it once (or create 1 and skip 1, depends on implementation details, but total in DB should be 1)
    // My implementation updates existing ones.
    expect(importResult.results.books.created).toBe(1);
    expect(importResult.results.books.updated).toBe(1);
    expect(importResult.results.sessions.created).toBe(2);

    // Verify DB has only 1 book
    const booksResponse = await request.get(`${API_URL}/books`);
    const books = await booksResponse.json();
    expect(books.length).toBe(1);
    expect(books[0].title).toBe('Duplicate Book');

    // Verify both sessions are there
    const sessionsResponse = await request.get(`${API_URL}/books/${books[0].id}/sessions`);
    const sessions = await sessionsResponse.json();
    expect(sessions.length).toBe(2);
  });
});
