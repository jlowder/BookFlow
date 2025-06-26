import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Info, Check } from "lucide-react";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Book, ReadingSession } from "@shared/schema";

interface ReadingTimelineProps {
  editModeBookId?: number | null;
  onEditModeToggle?: (bookId: number) => void;
}

export default function ReadingTimeline({ editModeBookId, onEditModeToggle }: ReadingTimelineProps) {
  const [timeRange, setTimeRange] = useState("30");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: books = [] } = useQuery<Book[]>({
    queryKey: ["/api/books"],
  });

  // Mutation for toggling reading sessions
  const toggleSessionMutation = useMutation({
    mutationFn: async ({ bookId, date, hasSession }: { bookId: number; date: string; hasSession: boolean }) => {
      if (hasSession) {
        // Find and delete the session for this book on this date
        const sessions = await fetch(`/api/reading-sessions?date=${date}`).then(r => r.json());
        const sessionToDelete = sessions.find((s: any) => s.bookId === bookId);
        if (sessionToDelete) {
          await apiRequest("DELETE", `/api/reading-sessions/${sessionToDelete.id}`);
        }
      } else {
        // Create a new session
        await apiRequest("POST", "/api/reading-sessions", {
          bookId,
          date,
          pagesRead: 1,
          duration: 30,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reading-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Reading session updated",
        description: "Your reading progress has been updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update reading session",
        variant: "destructive",
      });
    },
  });

  // Handler for grid cell clicks in edit mode
  const handleGridCellClick = (day: any) => {
    if (!editModeBookId || day.isEmpty || !day.date) return;
    
    // Check if this book already has a session on this date
    const hasSession = day.sessions.some((session: any) => session.bookId === editModeBookId);
    
    toggleSessionMutation.mutate({
      bookId: editModeBookId,
      date: day.date,
      hasSession
    });
  };

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
    queryKey: ["/api/reading-sessions", timeRange, endDate.toISOString().split('T')[0]],
    queryFn: () => 
      fetch(`/api/reading-sessions?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`)
        .then(res => res.json()),
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes to catch date changes
    staleTime: 2 * 60 * 1000, // Consider data stale after 2 minutes
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
      const currentDate = day.date;
      const hasSession = day.sessions.some(session => session.bookId === book.id);
      const width = 100 / totalDays;
      
      // Check if this date is within the book's active period
      const isBeforeStart = book.startDate && currentDate < book.startDate;
      const isAfterCompletion = book.completedDate && currentDate > book.completedDate;
      const isVisible = !isBeforeStart && !isAfterCompletion;
      
      // Special handling for completion date - show checkmark
      const isCompletionDate = book.completedDate && currentDate === book.completedDate;
      
      segments.push({
        width: `${width}%`,
        opacity: isVisible ? (hasSession ? 0.8 : 0.3) : 0,
        color: book.color,
        isVisible,
        isCompletionDate,
        hasSession
      });
    }
    
    return segments;
  };

  // Generate grid data for GitHub-style view
  const generateGridData = () => {
    if (timelineData.length === 0) return { weeks: [], monthLabels: [] };
    
    const weeks = [];
    const monthLabels = [];
    // Parse dates without timezone issues
    const startDateStr = timelineData[0].date;
    const endDateStr = timelineData[timelineData.length - 1].date;
    const startDate = new Date(startDateStr + 'T00:00:00');
    const endDate = new Date(endDateStr + 'T00:00:00');
    
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
    let currentMonth = -1; // Initialize to -1 to ensure first month is captured
    let weekIndex = 0;
    
    while (currentDate <= endDate) {
      const week = new Array(7).fill(null); // Pre-fill array with 7 slots for each day
      
      // Track month changes for labels - but only for dates within our actual range
      if (currentDate >= startDate && currentDate.getMonth() !== currentMonth) {
        currentMonth = currentDate.getMonth();
        monthLabels.push({
          month: currentDate.toLocaleDateString('en-US', { month: 'short' }),
          weekIndex: weekIndex
        });
      }
      
      // Generate 7 days for this week, placing each day in the correct position
      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        // Use local date string to avoid timezone issues
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        const actualDayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const dayData = dayMap.get(dateStr);
        
        if (dayData) {
          // Get unique books for this day (avoid duplicates from multiple sessions)
          const bookIds = dayData.sessions.map((session: any) => session.bookId) as number[];
          const uniqueBookIds = bookIds.filter((id: number, index: number) => bookIds.indexOf(id) === index);
          const dayBooks = uniqueBookIds.map((bookId: number) => 
            books.find(book => book.id === bookId)
          ).filter(Boolean) as Book[];
          
          const colors = dayBooks.map(book => book.color);
          
          week[actualDayOfWeek] = {
            date: dateStr,
            isEmpty: false,
            sessions: dayData.sessions,
            colors: colors.length > 0 ? colors : [],
            hasReading: dayData.hasReading
          };
        } else {
          // Day outside our range or no data
          const isInRange = currentDate >= startDate && currentDate <= endDate;
          week[actualDayOfWeek] = {
            date: isInRange ? dateStr : '',
            isEmpty: !isInRange,
            sessions: [],
            colors: [],
            hasReading: false
          };
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Fill any null slots with empty days
      for (let i = 0; i < 7; i++) {
        if (week[i] === null) {
          week[i] = {
            date: '',
            isEmpty: true,
            sessions: [],
            colors: [],
            hasReading: false
          };
        }
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
                  <div className="flex">
                    {gridData.monthLabels?.map((label, i) => (
                      <div 
                        key={i} 
                        className="text-xs text-gray-600 dark:text-gray-400"
                        style={{ 
                          position: 'absolute',
                          left: `${32 + (label.weekIndex * 16)}px`
                        }}
                      >
                        {label.month}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Grid with Day Labels - GitHub Style Horizontal Layout */}
                <div className="flex">
                  {/* Day of Week Labels */}
                  <div className="flex flex-col">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                      <div key={i} className="w-8 h-3 mb-1 text-xs text-gray-500 text-right pr-2 flex items-center justify-end">
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  {/* Grid - Weeks flow horizontally */}
                  <div className="flex">
                    {gridData.weeks?.map((week: any, weekIndex: number) => (
                      <div key={weekIndex} className="flex flex-col">
                        {week.map((day: any, dayIndex: number) => (
                          <div
                            key={dayIndex}
                            className={`w-3 h-3 rounded-sm mb-1 mr-1 border border-gray-200 ${
                              editModeBookId && !day.isEmpty && day.date ? 'cursor-pointer hover:border-blue-400' : ''
                            }`}
                            style={{
                              background: day.isEmpty 
                                ? 'transparent'
                                : day.colors.length === 0
                                  ? '#f3f4f6'
                                  : day.colors.length === 1
                                    ? day.colors[0]
                                    : day.colors.length === 2
                                      ? `linear-gradient(45deg, ${day.colors[0]} 50%, ${day.colors[1]} 50%)`
                                      : day.colors.length === 3
                                        ? `linear-gradient(120deg, ${day.colors[0]} 33.33%, ${day.colors[1]} 33.33% 66.66%, ${day.colors[2]} 66.66%)`
                                        : `linear-gradient(90deg, ${day.colors.slice(0, 4).map((color: string, i: number) => `${color} ${i * 25}% ${(i + 1) * 25}%`).join(', ')})`
                            }}
                            title={day.isEmpty ? '' : new Date(day.date + 'T00:00:00').toLocaleDateString()}
                            onClick={() => handleGridCellClick(day)}
                          ></div>
                        ))}
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
                              className="h-full relative"
                              style={{ 
                                width: segment.width,
                                backgroundColor: segment.isVisible ? segment.color : 'transparent',
                                opacity: segment.isVisible ? segment.opacity : 0
                              }}
                            >
                              {segment.isCompletionDate && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center border-2" style={{ borderColor: book.color }}>
                                    <Check className="w-2 h-2" style={{ color: book.color }} />
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
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
