import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, FileText, BookOpen, CheckCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Book, ReadingSession } from "@shared/schema";

interface BookDetailsModalProps {
  book: Book | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function BookDetailsModal({ book, isOpen, onClose }: BookDetailsModalProps) {
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
    enabled: isOpen && !!book,
  });

  if (!book) return null;

  const bookSessions = sessions.filter(session => session.bookId === book.id);
  const totalPagesRead = bookSessions.reduce((sum, session) => sum + (session.pagesRead || 0), 0);
  const totalDuration = bookSessions.reduce((sum, session) => sum + (session.duration || 0), 0);

  // Generate timeline visualization for this book
  const generateBookTimeline = () => {
    if (bookSessions.length === 0) return [];

    const sortedSessions = [...bookSessions].sort((a, b) => a.date.localeCompare(b.date));
    const startDate = new Date(sortedSessions[0].date + 'T00:00:00');
    const endDate = new Date(sortedSessions[sortedSessions.length - 1].date + 'T00:00:00');

    // Create session map for quick lookup
    const sessionMap = new Map();
    sortedSessions.forEach(session => {
      sessionMap.set(session.date, session);
    });

    // Generate timeline data
    const timeline = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
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

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

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
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{book.title}</h2>
                <p className="text-lg text-gray-600 dark:text-gray-300">{book.author}</p>
                
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(book.status)}>
                    {book.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                    {book.status.charAt(0).toUpperCase() + book.status.slice(1)}
                  </Badge>
                  
                  {book.totalPages && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {book.totalPages} pages
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  {book.startDate && (
                    <span>Started: {new Date(book.startDate + 'T00:00:00').toLocaleDateString()}</span>
                  )}
                  {book.completedDate && (
                    <span>Completed: {new Date(book.completedDate + 'T00:00:00').toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Reading Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Calendar className="w-4 h-4" />
                  Sessions
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{bookSessions.length}</div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <BookOpen className="w-4 h-4" />
                  Pages Read
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalPagesRead}</div>
              </div>
              
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
                          className={`w-3 h-3 rounded-sm ${
                            day.hasSession 
                              ? 'bg-green-500' 
                              : 'bg-gray-200 dark:bg-gray-600'
                          }`}
                          title={`${day.displayDate}${day.hasSession ? ' - Read' : ' - No reading'}`}
                        />
                      ))}
                    </div>
                    
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>{timelineData[0]?.displayDate}</span>
                      <span>{timelineData[timelineData.length - 1]?.displayDate}</span>
                    </div>
                  </div>

                  {/* Session Details */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">Reading Sessions</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {bookSessions.map((session) => (
                        <div key={session.id} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">
                                {new Date(session.date + 'T00:00:00').toLocaleDateString('en-US', { 
                                  weekday: 'short', 
                                  month: 'short', 
                                  day: 'numeric' 
                                })}
                              </div>
                              {session.notes && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{session.notes}</p>
                              )}
                            </div>
                            <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                              {session.pagesRead && <div>{session.pagesRead} pages</div>}
                              {session.duration && <div>{formatDuration(session.duration)}</div>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}