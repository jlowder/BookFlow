import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { GoogleBook } from "@shared/schema";

interface AddBookModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddBookModal({ isOpen, onClose }: AddBookModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GoogleBook[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedBook, setSelectedBook] = useState<GoogleBook | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await fetch(`/api/books/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error("Search failed");
      const data = await response.json();
      return data.items || [];
    },
    onSuccess: (results) => {
      setSearchResults(results);
      setIsSearching(false);
    },
    onError: () => {
      toast({
        title: "Search Error",
        description: "Failed to search for books. Please try again.",
        variant: "destructive",
      });
      setIsSearching(false);
    },
  });

  const addBookMutation = useMutation({
    mutationFn: async (bookData: any) => {
      await apiRequest("POST", "/api/books", bookData);
    },
    onSuccess: () => {
      toast({
        title: "Book Added!",
        description: "Successfully added to your reading list.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      queryClient.invalidateQueries({ queryKey: ["/api/books/status/reading"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      onClose();
      resetModal();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add book. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    searchMutation.mutate(searchQuery);
  };

  const handleAddBook = () => {
    if (!selectedBook) return;

    const bookData = {
      title: selectedBook.volumeInfo.title,
      author: selectedBook.volumeInfo.authors?.[0] || "Unknown Author",
      coverUrl: selectedBook.volumeInfo.imageLinks?.thumbnail || selectedBook.volumeInfo.imageLinks?.smallThumbnail,
      totalPages: selectedBook.volumeInfo.pageCount || 0,
      currentPage: 0,
      status: "reading" as const,
    };

    addBookMutation.mutate(bookData);
  };

  const resetModal = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSelectedBook(null);
    setIsSearching(false);
  };

  const handleClose = () => {
    onClose();
    resetModal();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md w-full max-h-[90vh] overflow-hidden" aria-describedby="add-book-description">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Add New Book
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        <div id="add-book-description" className="sr-only">
          Search for and add books to your reading list using the Google Books database
        </div>

        <div className="overflow-y-auto p-1">
          <div className="space-y-4">
            <div>
              <Label htmlFor="search" className="block text-sm font-medium text-primary mb-2">
                Search for Book
              </Label>
              <div className="flex space-x-2">
                <Input
                  id="search"
                  type="text"
                  placeholder="Enter book title or author..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="flex-1"
                />
                <Button 
                  onClick={handleSearch} 
                  disabled={isSearching || !searchQuery.trim()}
                  size="sm"
                >
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                <Label className="text-sm font-medium">Search Results</Label>
                {searchResults.map((book) => (
                  <div 
                    key={book.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedBook?.id === book.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedBook(book)}
                  >
                    <div className="flex space-x-3">
                      <img 
                        src={book.volumeInfo.imageLinks?.thumbnail || book.volumeInfo.imageLinks?.smallThumbnail || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=300"} 
                        alt={book.volumeInfo.title}
                        className="w-12 h-16 object-cover rounded" 
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 text-sm leading-tight">
                          {book.volumeInfo.title}
                        </h4>
                        <p className="text-sm text-gray-700 font-medium">
                          {book.volumeInfo.authors?.[0] || "Unknown Author"}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {book.volumeInfo.publishedDate?.split('-')[0] || 'Unknown'} • {book.volumeInfo.categories?.[0] || 'General'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {isSearching && (
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <p className="text-sm text-secondary mt-2">Searching for books...</p>
              </div>
            )}

            {searchQuery && searchResults.length === 0 && !isSearching && searchMutation.isSuccess && (
              <div className="text-center py-4">
                <p className="text-sm text-secondary">No books found. Try a different search term.</p>
              </div>
            )}

            <div className="flex space-x-3 pt-4 border-t">
              <Button 
                type="button" 
                variant="outline"
                onClick={handleClose} 
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAddBook}
                disabled={!selectedBook || addBookMutation.isPending}
                className="flex-1 bg-accent-blue hover:bg-blue-600 text-white"
              >
                {addBookMutation.isPending ? "Adding..." : "Add Book"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
