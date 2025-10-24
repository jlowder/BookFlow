import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar, FileText, BookOpen, CheckCircle, Palette } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toLocalDateString } from "@/lib/date-utils";
import type { Book, ReadingSession } from "@shared/schema";

interface BookDetailsModalProps {
  book: Book | null;
  isOpen: boolean;
  onClose: () => void;
}

function BookDetails({ book }: { book: Book }) {
  const { data: sessions = [] } = useQuery<ReadingSession[]>({
    queryKey: ["/api/reading-sessions", "all"],
    queryFn: async () => {
      // Get all sessions by using a wide date range
      const startDate = "2020-01-01";
      const endDate = "2030-12-31";
      const response = await fetch(`/api/reading-sessions?startDate=${startDate}&endDate=${endDate}`);
      if (!response.ok) {
        throw new Error('Failed to fetch reading sessions');
      }
      return response.json();
    },
    enabled: !!book,
  });

  const bookSessions = sessions.filter(session => session.bookId === book.id);

  const generateBookTimeline = () => {
    try {
      if (bookSessions.length === 0) return [];

      const sortedSessions = [...bookSessions].sort((a, b) => a.date.localeCompare(b.date));
      const startDate = new Date(sortedSessions[0].date + 'T00:00:00');
      const endDate = new Date(sortedSessions[sortedSessions.length - 1].date + 'T00:00:00');

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return [];

      const sessionMap = new Map();
      sortedSessions.forEach(session => {
        sessionMap.set(session.date, session);
      });

      const timeline = [];
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        const dateStr = toLocalDateString(currentDate);
        const session = sessionMap.get(dateStr);

        timeline.push({
          date: dateStr,
          hasSession: !!session,
          session: session || null,
          displayDate: currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }

      return timeline;
    } catch (error) {
      console.error("Error generating book timeline:", error);
      return [];
    }
  };

  const timelineData = generateBookTimeline();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'reading': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'paused': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const queryClient = useQueryClient();

  const updateBookColor = useMutation({
    mutationFn: async (newColor: string) => {
      const response = await fetch(`/api/books/${book.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ color: newColor }),
      });
      if (!response.ok) {
        throw new Error('Failed to update book color');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      queryClient.invalidateQueries({ queryKey: ["/api/books/status/reading"] });
      queryClient.invalidateQueries({ queryKey: ["/api/books/status/completed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reading-sessions", "all"] });
    },
  });

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateBookColor.mutate(e.target.value);
  };

  return (
    <ScrollArea className="max-h-[calc(90vh-8rem)]">
      <div className="space-y-6">
        {/* Book Header */}
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            {book.coverUrl ? (
              <img
                src={book.coverUrl}
                alt={book.title}
                className="w-24 h-32 object-cover rounded-lg shadow-md"
              />
            ) : (
              <div
                className="w-24 h-32 rounded-lg shadow-md flex items-center justify-center text-white text-xs font-medium"
                style={{ backgroundColor: book.color }}
              >
                {book.title.substring(0, 2)}
              </div>
            )}
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{book.title}</h2>
              <div className="relative">
                <input
                  type="color"
                  value={book.color}
                  onChange={handleColorChange}
                  className="w-8 h-8 p-1 border-2 border-gray-300 rounded-full cursor-pointer appearance-none"
                  style={{ backgroundColor: book.color }}
                />
                <Palette className="w-4 h-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white pointer-events-none" />
              </div>
            </div>
            <p className="text-lg text-gray-600 dark:text-gray-300">{book.author}</p>

            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(book.status || 'reading')}>
                {book.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                {(book.status || 'reading').charAt(0).toUpperCase() + (book.status || 'reading').slice(1)}
              </Badge>

              {book.totalPages && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {book.totalPages} pages
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              {book.startDate && !isNaN(new Date(book.startDate).getTime()) && (
                <span>Started: {new Date(book.startDate + 'T00:00:00').toLocaleDateString()}</span>
              )}
              {book.completedDate && !isNaN(new Date(book.completedDate).getTime()) && (
                <span>Completed: {new Date(book.completedDate + 'T00:00:00').toLocaleDateString()}</span>
              )}
            </div>
          </div>
        </div>

        {/* Reading Statistics */}
        <div className="grid grid-cols-1 gap-4">
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Calendar className="w-4 h-4" />
              Days Active
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{bookSessions.length}</div>
          </div>
        </div>

        {/* Notes */}
        {book.notes && (
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
              <FileText className="w-5 h-5" />
              Notes
            </h3>
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{book.notes}</p>
            </div>
          </div>
        )}

        {/* Reading Timeline */}
        {timelineData.length > 0 && (
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
              <Calendar className="w-5 h-5" />
              Reading Timeline
            </h3>

            <div className="space-y-4">
              {/* Timeline Visualization */}
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <div className="flex items-center gap-1 mb-2">
                  {timelineData.map((day, index) => (
                    <div
                      key={day.date}
                      className="w-3 h-3 rounded-sm"
                      style={{
                        backgroundColor: day.hasSession
                          ? book.color
                          : 'var(--gray-200)',
                      }}
                      title={`${day.displayDate}${day.hasSession ? ' - Read' : ' - No reading'}`}
                    />
                  ))}
                </div>
                
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>{timelineData[0]?.displayDate}</span>
                  <span>{timelineData[timelineData.length - 1]?.displayDate}</span>
                </div>
              </div>


            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

export default function BookDetailsModal({ book, isOpen, onClose }: BookDetailsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <BookOpen className="w-5 h-5" />
            Book Details
          </DialogTitle>
          <DialogDescription>
            View detailed information, reading history, and notes for this book.
          </DialogDescription>
        </DialogHeader>
        {book && <BookDetails book={book} />}
      </DialogContent>
    </Dialog>
  );
}