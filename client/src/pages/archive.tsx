import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { BookOpen, Library, Home, Github } from "lucide-react";
import type { Book } from "@shared/schema";
import BookCard from "@/components/book-card";
import BookDetailsModal from "@/components/book-details-modal";
import { useState } from "react";

export default function Archive() {
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isBookDetailsOpen, setIsBookDetailsOpen] = useState(false);

  const { data: completedBooks = [] } = useQuery<Book[]>({
    queryKey: ["/api/books/status/completed"],
  });

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
              <h1 className="text-xl font-bold text-primary">BookFlow Archive</h1>
              <a href="https://github.com/jlowder/BookFlow" target="_blank" rel="noopener noreferrer">
                <Github className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </a>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="outline" size="sm" className="flex items-center space-x-1">
                  <Home className="w-4 h-4" />
                  <span className="hidden sm:inline">Home</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-primary">All Completed Books</h2>
            <span className="text-sm text-secondary">{completedBooks.length} books completed</span>
          </div>

          {completedBooks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

      <BookDetailsModal
        book={selectedBook}
        isOpen={isBookDetailsOpen}
        onClose={handleCloseBookDetails}
      />
    </div>
  );
}
