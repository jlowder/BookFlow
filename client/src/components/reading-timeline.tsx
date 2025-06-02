import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Info, Check } from "lucide-react";
import { useState } from "react";
import type { Book, ReadingSession } from "@shared/schema";

export default function ReadingTimeline() {
  const [timeRange, setTimeRange] = useState("30");

  const { data: books = [] } = useQuery<Book[]>({
    queryKey: ["/api/books"],
  });

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - parseInt(timeRange));
  
  const { data: sessions = [] } = useQuery<ReadingSession[]>({
    queryKey: ["/api/reading-sessions", timeRange],
    queryFn: () => 
      fetch(`/api/reading-sessions?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`)
        .then(res => res.json()),
  });

  const currentBooks = books.filter(book => book.status === "reading");
  const completedBooks = books.filter(book => book.status === "completed");

  // Generate timeline data
  const generateTimelineData = () => {
    const days = parseInt(timeRange);
    const today = new Date();
    const timeline = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const daySessions = sessions.filter(session => session.date === dateStr);
      timeline.push({
        date: dateStr,
        sessions: daySessions,
        hasReading: daySessions.length > 0
      });
    }

    return timeline;
  };

  const timelineData = generateTimelineData();

  const getDateLabels = () => {
    const days = parseInt(timeRange);
    const labelCount = Math.min(5, days);
    const interval = Math.floor(days / (labelCount - 1));
    const labels = [];

    for (let i = 0; i < labelCount; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - (i * interval)));
      labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    }

    return labels;
  };

  const generateRibbonSegments = (book: Book) => {
    const segments = [];
    const totalDays = timelineData.length;
    
    for (let i = 0; i < totalDays; i++) {
      const day = timelineData[i];
      const hasSession = day.sessions.some(session => session.bookId === book.id);
      const width = 100 / totalDays;
      
      segments.push({
        width: `${width}%`,
        opacity: hasSession ? 0.8 : 0.3,
        color: book.color
      });
    }
    
    return segments;
  };

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-primary">Reading Timeline</h2>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 3 months</SelectItem>
            <SelectItem value="180">Last 6 months</SelectItem>
            <SelectItem value="365">This year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-6">
          {/* Book Legend */}
          <div className="flex flex-wrap items-center gap-4 mb-6 pb-4 border-b border-gray-100">
            {currentBooks.map(book => (
              <div key={book.id} className="flex items-center space-x-2">
                <div 
                  className="w-4 h-4 rounded" 
                  style={{ backgroundColor: book.color }}
                ></div>
                <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-40">{book.title}</span>
              </div>
            ))}
            {completedBooks.slice(0, 2).map(book => (
              <div key={book.id} className="flex items-center space-x-2">
                <div 
                  className="w-4 h-4 rounded" 
                  style={{ backgroundColor: book.color }}
                ></div>
                <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-40">
                  Completed: {book.title}
                </span>
              </div>
            ))}
          </div>

          {/* Timeline Visualization */}
          <div className="relative">
            {/* Date Labels */}
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-4">
              {getDateLabels().map((label, i) => (
                <span key={i}>{label}</span>
              ))}
            </div>

            {/* Timeline Ribbons */}
            <div className="space-y-3">
              {currentBooks.concat(completedBooks.slice(0, 2)).map(book => {
                const segments = generateRibbonSegments(book);
                const isCompleted = book.status === "completed";
                
                return (
                  <div key={book.id} className="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
                    <div className="absolute inset-0 flex">
                      {segments.map((segment, i) => (
                        <div 
                          key={i}
                          className="h-full"
                          style={{ 
                            width: segment.width,
                            backgroundColor: segment.color,
                            opacity: segment.opacity
                          }}
                        ></div>
                      ))}
                      {isCompleted && (
                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                          <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3" style={{ color: book.color }} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Timeline Interaction Hints */}
            <div className="flex items-center justify-center mt-6 text-xs text-gray-600 dark:text-gray-400">
              <Info className="w-4 h-4 mr-2" />
              <span>Darker sections indicate reading days • Lighter sections show gaps</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
