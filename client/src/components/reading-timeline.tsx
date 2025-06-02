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

  const getDateRange = () => {
    const endDate = new Date();
    const startDate = new Date();
    
    if (timeRange === "thisyear") {
      // This year - from January 1st to today
      startDate.setFullYear(endDate.getFullYear(), 0, 1);
    } else {
      // All other options go back by number of days
      const days = parseInt(timeRange);
      startDate.setDate(endDate.getDate() - days);
    }
    
    return { startDate, endDate };
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

  // Generate grid data for GitHub-style view
  const generateGridData = () => {
    if (timelineData.length === 0) return { weeks: [], monthLabels: [] };
    
    const weeks = [];
    const monthLabels = [];
    const startDate = new Date(timelineData[0].date);
    const endDate = new Date(timelineData[timelineData.length - 1].date);
    
    // Create a map for quick lookup of timeline data
    const dayMap = new Map();
    timelineData.forEach(day => {
      dayMap.set(day.date, day);
    });
    
    // Find the Sunday before our start date
    const gridStartDate = new Date(startDate);
    gridStartDate.setDate(startDate.getDate() - startDate.getDay());
    
    // Generate weeks
    let currentDate = new Date(gridStartDate);
    let currentMonth = currentDate.getMonth();
    let weekIndex = 0;
    
    while (currentDate <= endDate) {
      const week = [];
      
      // Track month changes for labels
      if (currentDate.getMonth() !== currentMonth || weekIndex === 0) {
        currentMonth = currentDate.getMonth();
        monthLabels.push({
          month: currentDate.toLocaleDateString('en-US', { month: 'short' }),
          weekIndex: weekIndex
        });
      }
      
      // Generate 7 days for this week
      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayData = dayMap.get(dateStr);
        
        if (dayData) {
          const dayBooks = dayData.sessions.map((session: any) => 
            books.find(book => book.id === session.bookId)
          ).filter(Boolean) as Book[];
          
          const colors = dayBooks.map(book => book.color);
          
          week.push({
            date: dateStr,
            isEmpty: false,
            sessions: dayData.sessions,
            colors: colors.length > 0 ? colors : [],
            hasReading: dayData.hasReading
          });
        } else {
          // Day outside our range or no data
          const isInRange = currentDate >= startDate && currentDate <= endDate;
          week.push({
            date: isInRange ? dateStr : '',
            isEmpty: !isInRange,
            sessions: [],
            colors: [],
            hasReading: false
          });
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      weeks.push(week);
      weekIndex++;
    }
    
    return { weeks, monthLabels };
  };

  const gridData = generateGridData();
  const shouldUseGridView = parseInt(timeRange) > 30 || timeRange === "thisyear";

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
            <SelectItem value="90">3 months</SelectItem>
            <SelectItem value="180">6 months</SelectItem>
            <SelectItem value="365">12 months</SelectItem>
            <SelectItem value="thisyear">This year</SelectItem>
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
            {shouldUseGridView ? (
              /* GitHub-style Grid View */
              <div className="space-y-4">
                {/* Month Labels */}
                <div className="flex text-xs text-gray-600 dark:text-gray-400 mb-2">
                  <div className="w-8"></div>
                  {gridData.monthLabels?.map((label, i) => (
                    <div key={i} className="text-xs text-gray-600 dark:text-gray-400" style={{ marginLeft: `${label.weekIndex * 16}px` }}>
                      {label.month}
                    </div>
                  ))}
                </div>
                
                {/* Grid with Day Labels */}
                <div className="flex">
                  {/* Day of Week Labels */}
                  <div className="flex flex-col mr-2">
                    <div className="h-3 mb-1"></div>
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                      <div key={i} className="w-6 h-3 text-xs text-gray-500 text-right pr-1 mb-1 flex items-center justify-end">
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  {/* Grid - Rotated to flow horizontally */}
                  <div className="flex">
                    {Array.from({ length: gridData.weeks?.[0]?.length || 7 }, (_, dayOfWeek) => (
                      <div key={dayOfWeek} className="flex flex-col mr-1">
                        {gridData.weeks?.map((week: any, weekIndex: number) => {
                          const day = week[dayOfWeek];
                          return (
                            <div
                              key={weekIndex}
                              className="w-3 h-3 rounded-sm mb-1 border border-gray-200"
                              style={{
                                background: day.isEmpty 
                                  ? 'transparent'
                                  : day.colors.length === 0
                                    ? '#f3f4f6'
                                    : day.colors.length === 1
                                      ? day.colors[0]
                                      : `linear-gradient(45deg, ${day.colors.slice(0, 4).join(', ')})`
                              }}
                              title={day.isEmpty ? '' : new Date(day.date).toLocaleDateString()}
                            ></div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Grid Interaction Hints */}
                <div className="flex items-center justify-center mt-4 text-xs text-gray-600 dark:text-gray-400">
                  <Info className="w-4 h-4 mr-2" />
                  <span>Each square represents a day • Multiple colors show different books read</span>
                </div>
              </div>
            ) : (
              /* Original Ribbon View */
              <div>
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
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
