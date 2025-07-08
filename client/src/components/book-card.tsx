import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Check, CheckCircle, FileText, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import BookDetailsModal from "./book-details-modal";
import type { Book } from "@shared/schema";

interface BookCardProps {
  book: Book;
  isEditMode?: boolean;
  onEditModeToggle?: (bookId: number) => void;
}

export default function BookCard({ book, isEditMode = false, onEditModeToggle }: BookCardProps) {
  const [isMarked, setIsMarked] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [notes, setNotes] = useState(book.notes || "");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const markReadMutation = useMutation({
    mutationFn: async () => {
      // Use local timezone instead of UTC
      const today = new Date();
      const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000);
      const todayLocal = localDate.toISOString().split('T')[0];
      
      await apiRequest("POST", "/api/reading-sessions", {
        bookId: book.id,
        date: todayLocal,
        pagesRead: 1,
        duration: 30,
      });
    },
    onSuccess: () => {
      setIsMarked(true);
      toast({
        title: "Reading recorded!",
        description: `Marked progress for "${book.title}"`,
      });
      
      // Reset after 2 seconds
      setTimeout(() => setIsMarked(false), 2000);
      
      queryClient.invalidateQueries({ queryKey: ["/api/reading-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to record reading session",
        variant: "destructive",
      });
    },
  });

  const markCompleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/books/${book.id}`, {
        status: "completed"
      });
    },
    onSuccess: () => {
      toast({
        title: "Book completed!",
        description: `"${book.title}" moved to completed books`,
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      queryClient.invalidateQueries({ queryKey: ["/api/books/status/reading"] });
      queryClient.invalidateQueries({ queryKey: ["/api/books/status/completed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mark book as completed",
        variant: "destructive",
      });
    },
  });

  const updateNotesMutation = useMutation({
    mutationFn: async (newNotes: string) => {
      await apiRequest("PATCH", `/api/books/${book.id}`, {
        notes: newNotes
      });
    },
    onSuccess: () => {
      toast({
        title: "Notes updated!",
        description: "Your notes have been saved",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      queryClient.invalidateQueries({ queryKey: ["/api/books/status/reading"] });
      queryClient.invalidateQueries({ queryKey: ["/api/books/status/completed"] });
      setIsNotesOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save notes",
        variant: "destructive",
      });
    },
  });

  const handleSaveNotes = () => {
    updateNotesMutation.mutate(notes);
  };

  const progressPercentage = book.totalPages ? (book.currentPage || 0) / book.totalPages * 100 : 0;

  // Generate recent reading pattern (mock for now)
  const recentPattern = Array.from({ length: 5 }, (_, i) => ({
    read: Math.random() > 0.4,
    opacity: Math.random() > 0.3 ? 1 : 0.3,
  }));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
      <div className="flex space-x-4">
        <img 
          src={book.coverUrl || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=450"} 
          alt={book.title}
          className="w-16 h-24 object-cover rounded-lg shadow-sm flex-shrink-0 cursor-pointer hover:shadow-md transition-shadow duration-200" 
          onClick={() => setIsDetailsOpen(true)}
        />
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-primary truncate">{book.title}</h3>
          <p className="text-sm mb-2 text-[#6c5672]">{book.author}</p>
          
          <div className="flex items-center space-x-2 mb-3">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: book.color }}
            ></div>
            <span className="text-xs text-[#534d6c]">
              {book.totalPages ? `${book.totalPages} pages` : 'Progress tracking'}
            </span>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Button
                size="sm"
                variant="outline"
                onClick={() => markReadMutation.mutate()}
                disabled={markReadMutation.isPending || isMarked}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input hover:text-accent-foreground h-9 rounded-md px-3 text-xs transition-colors duration-200 hover:bg-gray-200 bg-[#dcfce7]"
              >
                <Check className="w-3 h-3 mr-1" />
                {isMarked ? 'Recorded!' : 'Read Today'}
              </Button>
              
              <div className="flex space-x-1">
                {recentPattern.map((day, i) => (
                  <div 
                    key={i}
                    className="w-2 h-2 rounded-full"
                    style={{ 
                      backgroundColor: book.color,
                      opacity: day.read ? day.opacity : 0.3
                    }}
                  ></div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsNotesOpen(true)}
                className="h-8 w-8 rounded-md p-0 bg-[#e5e7eb] hover:bg-gray-300 border-gray-300 text-gray-700"
              >
                <FileText className="w-4 h-4" />
              </Button>
              {onEditModeToggle && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEditModeToggle(book.id)}
                  className={`h-8 w-8 rounded-md p-0 border-gray-300 text-gray-700 ${
                    isEditMode 
                      ? 'bg-blue-100 hover:bg-blue-200 border-blue-300' 
                      : 'bg-[#e5e7eb] hover:bg-gray-300'
                  }`}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => markCompleteMutation.mutate()}
                disabled={markCompleteMutation.isPending}
                className="gap-2 text-sm font-medium inline-flex items-center justify-center whitespace-nowrap ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border hover:text-accent-foreground h-8 w-8 rounded-md hover:bg-green-100 border-green-200 text-green-700 p-0 bg-[#e5e7eb]"
              >
                <CheckCircle className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
      {/* Notes Dialog */}
      <Dialog open={isNotesOpen} onOpenChange={setIsNotesOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Notes for "{book.title}"</DialogTitle>
            <DialogDescription>
              Add your thoughts, quotes, or notes about this book
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Add your thoughts, quotes, or notes about this book..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={6}
              className="resize-none"
            />
            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                onClick={() => setIsNotesOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveNotes}
                disabled={updateNotesMutation.isPending}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {updateNotesMutation.isPending ? 'Saving...' : 'Save Notes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Book Details Modal */}
      <BookDetailsModal 
        book={book}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
      />
    </div>
  );
}
