import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCurrentDate } from "../hooks/use-current-date";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { BookOpen, Plus, Flame, Library, Database, Github } from "lucide-react";
import type { Book, ReadingSession } from "@shared/schema";
import BookCard from "@/components/book-card";
import AddBookModal from "@/components/add-book-modal";
import ReadingTimeline from "@/components/reading-timeline";
import BookDetailsModal from "@/components/book-details-modal";
import { toLocalDateString } from "@/lib/date-utils";
import { apiRequest } from "@/lib/queryClient";

export default function Home() {
  const [isAddBookModalOpen, setIsAddBookModalOpen] = useState(false);
  const [editModeBookId, setEditModeBookId] = useState<number | null>(null);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isBookDetailsOpen, setIsBookDetailsOpen] = useState(false);
  const [timeRange, setTimeRange] = useState("30");
  const currentDate = useCurrentDate();

  useEffect(() => {
    const checkScreenSize = () => {
      if (window.innerWidth < 640) {
        setTimeRange("30");
      }
    };
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  const getDateRange = () => {
    const endDate = new Date(currentDate);
    const startDate = new Date(currentDate);

    if (timeRange === "all") {
      startDate.setFullYear(1970, 0, 1);
    } else {
      const days = parseInt(timeRange);
      startDate.setDate(endDate.getDate() - days);
    }

    return { startDate, endDate };
  };

  const { startDate, endDate } = getDateRange();

  const currentDateString = currentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const { data: currentBooks = [], isLoading: booksLoading } = useQuery<Book[]>({
    queryKey: ["/api/books/status/reading"],
  });

  const { data: readingSessionsToday = [] } = useQuery<ReadingSession[]>({
    queryKey: ["/api/reading-sessions", toLocalDateString(currentDate)],
    queryFn: () => {
      const today = toLocalDateString(currentDate);
      return apiRequest("GET", `/api/reading-sessions?date=${today}`);
    }
  });

  const readingSessionsByBookId = new Map(
    readingSessionsToday.map(session => [session.bookId, session])
  );

  const { data: completedBooks = [] } = useQuery<Book[]>({
    queryKey: ["/api/books/status/completed", toLocalDateString(startDate), toLocalDateString(endDate)],
    queryFn: () => {
      const start = toLocalDateString(startDate);
      const end = toLocalDateString(endDate);
      return apiRequest("GET", `/api/books/status/completed?startDate=${start}&endDate=${end}`);
    }
  });

  const { data: stats = { streak: 0, totalBooks: 0 } } = useQuery<{ streak: number; totalBooks: number }>({
    queryKey: ["/api/stats", toLocalDateString(currentDate)],
    queryFn: () => {
      const today = toLocalDateString(currentDate);
      return fetch(`/api/stats?today=${today}`).then(res => res.json());
    }
  });

  const handleEditModeToggle = (bookId: number) => {
    setEditModeBookId(editModeBookId === bookId ? null : bookId);
  };

  const handleBookClick = (book: Book) => {
    setSelectedBook(book);
    setIsBookDetailsOpen(true);
  };

  const handleCloseBookDetails = () => {
    setIsBookDetailsOpen(false);
    setSelectedBook(null);
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-accent-blue rounded-lg flex items-center justify-center">
                <BookOpen className="text-white w-4 h-4" />
              </div>
              <h1 className="text-xl font-bold text-primary">BookFlow</h1>
              <a href="https://github.com/jlowder/BookFlow" target="_blank" rel="noopener noreferrer">
                <Github className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </a>
            </div>
            <div className="flex items-center space-x-4">
               <p className="text-sm text-gray-600">{currentDateString}</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-6 text-sm">
                <span className="flex items-center space-x-1 text-gray-700 dark:text-gray-300">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <span className="font-medium" data-testid="current-streak-value">{stats.streak} day streak</span>
                </span>
                <span className="flex items-center space-x-1 text-gray-700 dark:text-gray-300">
                  <BookOpen className="w-4 h-4 text-blue-500" />
                  <span className="font-medium">{currentBooks.length} reading</span>
                </span>
                <span className="flex items-center space-x-1 text-gray-700 dark:text-gray-300">
                  <Library className="w-4 h-4 text-green-500" />
                  <span className="font-medium">{stats.totalBooks} completed</span>
                </span>
              </div>
              
              <Link href="/data-management">
                <Button variant="outline" size="sm" className="flex items-center space-x-1">
                  <Database className="w-4 h-4" />
                  <span className="hidden sm:inline">Data</span>
                </Button>
              </Link>
              
              <Button 
                onClick={() => setIsAddBookModalOpen(true)}
                className="bg-accent-blue hover:bg-blue-600 text-white flex items-center space-x-2"
                data-testid="add-book-button"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Book</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Currently Reading */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-primary">Currently Reading</h2>
            <span className="text-sm text-secondary">{currentBooks.length} books</span>
          </div>
          
          {booksLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
                  <div className="flex space-x-4">
                    <div className="w-16 h-24 bg-gray-200 rounded-lg"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded"></div>
                      <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : currentBooks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
              {currentBooks.map((book: Book) => (
                <BookCard 
                  key={book.id} 
                  book={book} 
                  isEditMode={editModeBookId === book.id}
                  onEditModeToggle={handleEditModeToggle}
                  onClick={handleBookClick}
                  status="reading"
                  isReadToday={readingSessionsByBookId.has(book.id)}
                  readingSessionId={readingSessionsByBookId.get(book.id)?.id}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No books currently reading</h3>
              <p className="text-gray-600 mb-4">Start your reading journey by adding your first book.</p>
              <Button 
                onClick={() => setIsAddBookModalOpen(true)}
                className="bg-accent-blue hover:bg-blue-600 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Book
              </Button>
            </div>
          )}
        </section>

        {/* Reading Timeline */}
        <ReadingTimeline 
          editModeBookId={editModeBookId}
          onEditModeToggle={handleEditModeToggle}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          startDate={startDate}
          endDate={endDate}
        />

        {/* Completed Books */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-primary">Completed Books</h2>
            <Link href="/archive">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </div>
          
          {completedBooks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
              {completedBooks.map((book: Book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  onClick={handleBookClick}
                  status="completed"
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <Library className="w-8 h-8 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No completed books yet. Keep reading to build your library!</p>
            </div>
          )}
        </section>

      </main>

      <AddBookModal 
        isOpen={isAddBookModalOpen} 
        onClose={() => setIsAddBookModalOpen(false)} 
      />
      
      <BookDetailsModal 
        book={selectedBook}
        isOpen={isBookDetailsOpen}
        onClose={handleCloseBookDetails}
      />
    </div>
  );
}
