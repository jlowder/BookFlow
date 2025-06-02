import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Info, Check } from "lucide-react";
import { useState } from "react";
import type { Book, ReadingSession } from "@shared/schema";

export default function ReadingTimeline() {
  const [timeRange, setTimeRange] = useState("30");

  // Generate month options for the last 12 months
  const getMonthOptions = () => {
    const months = [];
    const today = new Date();
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
      
      months.push({
        value: `month-${i}`,
        label: monthName,
        days: daysInMonth,
        startDate: date
      });
    }
    
    return months;
  };

  const monthOptions = getMonthOptions();

  const { data: books = [] } = useQuery<Book[]>({
    queryKey: ["/api/books"],
  });

  const getDateRange = () => {
    if (timeRange.startsWith('month-')) {
      const monthIndex = parseInt(timeRange.replace('month-', ''));
      const monthOption = monthOptions[monthIndex];
      const startDate = new Date(monthOption.startDate);
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
      return { startDate, endDate };
    } else {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - parseInt(timeRange));
      return { startDate, endDate };
    }
  };

  const { startDate, endDate } = getDateRange();
  
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
    const timeline = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];
      const daySessions = sessions.filter(session => session.date === dateStr);
      
      timeline.push({
        date: dateStr,
        sessions: daySessions,
        hasReading: daySessions.length > 0
      });
      
      current.setDate(current.getDate() + 1);
    }

    return timeline;
  };

  const timelineData = generateTimelineData();

  const getDateLabels = () => {
    const totalDays = timelineData.length;
    const labelCount = Math.min(5, totalDays);
    const interval = Math.max(1, Math.floor(totalDays / (labelCount - 1)));
    const labels = [];

    for (let i = 0; i < labelCount; i++) {
      const index = Math.min(i * interval, totalDays - 1);
      const dayData = timelineData[index];
      if (dayData) {
        const date = new Date(dayData.date);
        labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      }
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
            {monthOptions.map((month) => (
              <SelectItem key={month.value} value={month.value}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-6">
          {/* Book Legend */}
          <div className="flex flex-wrap items-center gap-4 mb-6 pb-4 border-b border-gray-100">
            {books.slice(0, 5).map(book => (
              <div key={book.id} className="flex items-center space-x-2">
                <div 
                  className="w-4 h-4 rounded" 
                  style={{ backgroundColor: book.color }}
                ></div>
                <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-40">
                  {book.status === "completed" ? "✓ " : ""}{book.title}
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
              {books.slice(0, 5).map(book => {
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
