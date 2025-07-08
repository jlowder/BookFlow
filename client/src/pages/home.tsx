import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { BookOpen, Plus, Flame, Library } from "lucide-react";
import type { Book } from "@shared/schema";
import BookCard from "@/components/book-card";
import AddBookModal from "@/components/add-book-modal";
import ReadingTimeline from "@/components/reading-timeline";
import BookDetailsModal from "@/components/book-details-modal";

export default function Home() {
  const [isAddBookModalOpen, setIsAddBookModalOpen] = useState(false);
  const [editModeBookId, setEditModeBookId] = useState<number | null>(null);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isBookDetailsOpen, setIsBookDetailsOpen] = useState(false);

  const { data: currentBooks = [], isLoading: booksLoading } = useQuery<Book[]>({
    queryKey: ["/api/books/status/reading"],
  });

  const { data: completedBooks = [] } = useQuery<Book[]>({
    queryKey: ["/api/books/status/completed"],
  });

  const { data: stats = { streak: 0, totalBooks: 0 } } = useQuery<{ streak: number; totalBooks: number }>({
    queryKey: ["/api/stats"],
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-accent-blue rounded-lg flex items-center justify-center">
                <BookOpen className="text-white w-4 h-4" />
              </div>
              <h1 className="text-xl font-bold text-primary">BookFlow</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-6 text-sm">
                <span className="flex items-center space-x-1 text-gray-700 dark:text-gray-300">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <span className="font-medium">{stats.streak} day streak</span>
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
              
              <Button 
                onClick={() => setIsAddBookModalOpen(true)}
                className="bg-accent-blue hover:bg-blue-600 text-white flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Book</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Currently Reading */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-primary">Currently Reading</h2>
            <span className="text-sm text-secondary">{currentBooks.length} books</span>
          </div>
          
          {booksLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentBooks.map((book: Book) => (
                <BookCard 
                  key={book.id} 
                  book={book} 
                  isEditMode={editModeBookId === book.id}
                  onEditModeToggle={handleEditModeToggle}
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
        />

        {/* Completed Books */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-primary">Completed This Year</h2>
            <span className="text-sm text-secondary">{completedBooks.length} books completed</span>
          </div>
          
          {completedBooks.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
              {completedBooks.map((book: Book) => (
                <div key={book.id} className="group cursor-pointer" onClick={() => handleBookClick(book)}>
                  <img 
                    src={book.coverUrl || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=450"} 
                    alt={book.title}
                    className="w-full h-32 object-cover rounded-lg shadow-sm group-hover:shadow-md transition-shadow duration-200" 
                  />
                  <p className="text-xs text-secondary mt-2 truncate">{book.title}</p>
                </div>
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
