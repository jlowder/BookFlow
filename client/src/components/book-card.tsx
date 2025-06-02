import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Book } from "@shared/schema";

interface BookCardProps {
  book: Book;
}

export default function BookCard({ book }: BookCardProps) {
  const [isMarked, setIsMarked] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const markReadMutation = useMutation({
    mutationFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      await apiRequest("POST", "/api/reading-sessions", {
        bookId: book.id,
        date: today,
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
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to record reading session",
        variant: "destructive",
      });
    },
  });

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
          className="w-16 h-24 object-cover rounded-lg shadow-sm flex-shrink-0" 
        />
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-primary truncate">{book.title}</h3>
          <p className="text-sm text-secondary mb-2">{book.author}</p>
          
          <div className="flex items-center space-x-2 mb-3">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: book.color }}
            ></div>
            <span className="text-xs text-secondary">
              {book.totalPages ? `Page ${book.currentPage || 0} of ${book.totalPages}` : 'Progress tracking'}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <Button
              size="sm"
              variant="outline"
              onClick={() => markReadMutation.mutate()}
              disabled={markReadMutation.isPending || isMarked}
              className={`text-xs transition-colors duration-200 ${
                isMarked 
                  ? 'bg-accent-green text-white border-accent-green' 
                  : 'hover:bg-gray-200'
              }`}
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
        </div>
      </div>
    </div>
  );
}
