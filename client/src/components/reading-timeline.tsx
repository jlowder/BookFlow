import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { toLocalDateString } from "@/lib/date-utils";
import type { Book, ReadingSession } from "@shared/schema";

interface ReadingTimelineProps {
  editModeBookId?: number | null;
  onEditModeToggle?: (bookId: number) => void;
  timeRange: string;
  onTimeRangeChange: (value: string) => void;
  startDate: Date;
  endDate: Date;
  canShowGridView: boolean;
}

export default function ReadingTimeline({
  editModeBookId,
  onEditModeToggle,
  timeRange,
  onTimeRangeChange,
  startDate,
  endDate,
  canShowGridView,
}: ReadingTimelineProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Force cache invalidation on mount and time range changes to ensure fresh data
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/reading-sessions"] });
    queryClient.invalidateQueries({ queryKey: ["/api/books"] });
  }, [queryClient, timeRange]);

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

  // For grid view, we need to fetch data from the Sunday before the start date
  // to ensure the first week's padding days have session data
  const shouldUseGridView = canShowGridView && (timeRange === 'all' || parseInt(timeRange) > 30);
  const fetchStartDate = shouldUseGridView 
    ? (() => {
        const gridStart = new Date(startDate);
        gridStart.setDate(startDate.getDate() - startDate.getDay()); // Go to Sunday
        return gridStart;
      })()
    : startDate;
  
  const { data: sessions = [] } = useQuery<ReadingSession[]>({
    queryKey: ["/api/reading-sessions", timeRange, toLocalDateString(fetchStartDate), toLocalDateString(endDate)],
    queryFn: () => {
      const fetchStart = toLocalDateString(fetchStartDate);
      const fetchEnd = toLocalDateString(endDate);
      console.log(`[Timeline] Fetching sessions: timeRange=${timeRange}, startDate=${fetchStart}, endDate=${fetchEnd}, shouldUseGridView=${shouldUseGridView}`);
      return fetch(`/api/reading-sessions?startDate=${fetchStart}&endDate=${fetchEnd}`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      }).then(res => res.json());
    },
    staleTime: 0,
  });

  const currentBooks = books.filter(book => book.status === "reading");
  const completedBooks = books.filter(book => book.status === "completed");
  
  // Filter books to only show those with sessions in the current time range
  const booksWithSessionsInRange = books.filter(book => {
    return sessions.some(session => session.bookId === book.id);
  });
  


  // Generate timeline data
  const generateTimelineData = () => {
    const timeline = [];
    // For grid view, start from fetchStartDate to include padding days
    // For ribbon view, use the regular startDate
    const timelineStart = shouldUseGridView ? fetchStartDate : startDate;
    const current = new Date(timelineStart);
    
    while (current <= endDate) {
      const dateStr = toLocalDateString(current);
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
    if (totalDays === 0) return [];
    
    const labelCount = Math.min(5, totalDays);
    const labels = [];

    if (labelCount === 1) {
      // If only one label, show the last day
      const dayData = timelineData[totalDays - 1];
      const date = new Date(dayData.date + 'T00:00:00');
      labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    } else {
      // Calculate interval for intermediate labels
      const interval = Math.floor((totalDays - 1) / (labelCount - 1));
      
      for (let i = 0; i < labelCount - 1; i++) {
        const index = i * interval;
        const dayData = timelineData[index];
        if (dayData) {
          const date = new Date(dayData.date + 'T00:00:00');
          labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        }
      }
      
      // Always ensure the last label shows the actual end date
      const lastDayData = timelineData[totalDays - 1];
      if (lastDayData) {
        const date = new Date(lastDayData.date + 'T00:00:00');
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
      
      // For timeline visualization, show all sessions regardless of book start/completion dates
      // Users should see their complete reading history
      const isVisible = true;
      
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

  const generateGridData = () => {
    if (timelineData.length === 0) return [];

    // Create a map for quick lookup of timeline data
    const dayMap = new Map(timelineData.map(day => [day.date, day]));

    // Pre-compute book lookup Map for O(1) lookups instead of O(n) find() calls
    // This improves complexity from O(n×m×k) to O(m×k) where:
    // n = total books, m = total days, k = avg books per day
    const bookMap = new Map(books.map(b => [b.id, b]));

    // Use the startDate and endDate props passed from parent (home.tsx)
    // For "All Time" selection, startDate will be 1970-01-01 and endDate will be current date
    const gridDataStartDate = new Date(startDate.getTime());
    const gridDataEndDate = new Date(endDate.getTime());

    // Generate a complete year range from the props
    const years: number[] = [];
    const startYear = gridDataStartDate.getFullYear();
    const endYear = gridDataEndDate.getFullYear();
    for (let y = endYear; y >= startYear; y--) {
      years.push(y);
    }

    const yearlyGrids = years.map((year) => {
        // Create a complete year's worth of data, not just reading session dates
        // This ensures all 12 months are displayed for each year
        const yearStartDate = new Date(year, 0, 1);
        const yearEndDate = new Date(year, 11, 31);

        // Clamp to the overall date range
        const yearGridStartDate = new Date(Math.max(yearStartDate.getTime(), gridDataStartDate.getTime()));
        const yearGridEndDate = new Date(Math.min(yearEndDate.getTime(), gridDataEndDate.getTime()));

        // Find the Sunday before our start date
        const gridStartDate = new Date(yearGridStartDate);
        gridStartDate.setDate(yearGridStartDate.getDate() - yearGridStartDate.getDay());

        // Generate weeks
        const weeks: any[][] = [];
        const monthLabels: { month: string; weekIndex: number }[] = [];
        let currentDate = new Date(gridStartDate);
        let currentMonth = -1;
        let weekIndex = 0;

        while (currentDate <= yearGridEndDate) {
          const week: any[] = new Array(7).fill(null);

          for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
            if (currentDate >= yearGridStartDate && currentDate <= yearGridEndDate && currentDate.getMonth() !== currentMonth) {
              currentMonth = currentDate.getMonth();
              monthLabels.push({
                month: currentDate.toLocaleDateString('en-US', { month: 'short' }),
                weekIndex: weekIndex
              });
            }

            const dateStr = toLocalDateString(currentDate);
            const actualDayOfWeek = currentDate.getDay();
            const dayData = dayMap.get(dateStr);

            if (dayData) {
              const bookIds = dayData.sessions.map((s: ReadingSession) => s.bookId);
              const uniqueBookIds = [...new Set(bookIds)];
              // Use O(1) Map lookup instead of O(n) find()
              const dayBooks = uniqueBookIds.map(id => bookMap.get(id)).filter(Boolean) as Book[];
              // Safely extract colors with fallback for missing/invalid data
              const colors = dayBooks.map(b => b.color);

              // Pre-compute dateTitle to avoid Date object creation in render loop
              // This calculation happens once during data generation, not on every render
              const dateTitle = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

              week[actualDayOfWeek] = { date: dateStr, isEmpty: false, sessions: dayData.sessions, colors, hasReading: dayData.hasReading, dateTitle };
            } else {
              const isInRange = currentDate >= yearGridStartDate && currentDate <= yearGridEndDate;
              // Pre-compute dateTitle to avoid Date object creation in render loop
              const dateTitle = isInRange ? new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';

              week[actualDayOfWeek] = { date: isInRange ? dateStr : '', isEmpty: !isInRange, sessions: [], colors: [], hasReading: false, dateTitle };
            }

            currentDate.setDate(currentDate.getDate() + 1);
          }

          for (let i = 0; i < 7; i++) {
            if (week[i] === null) {
              week[i] = { date: '', isEmpty: true, sessions: [], colors: [], hasReading: false, dateTitle: '' };
            }
          }

          weeks.push(week);
          weekIndex++;
        }

        // Process month labels for this year's grid
        const processedMonthLabels: { month: string; weekIndex: number; left: number }[] = [];
        let lastLeft = -Infinity;
        const LABEL_SPACING = 30;
        monthLabels.forEach(label => {
          const idealLeft = label.weekIndex * 16;
          const newLeft = Math.max(idealLeft, lastLeft + LABEL_SPACING);
          processedMonthLabels.push({ ...label, left: newLeft });
          lastLeft = newLeft;
        });

        return { year: parseInt(year), weeks, monthLabels: processedMonthLabels };
      })
      .filter((grid) => {
        // Only show years that have at least one reading session
        return grid.weeks.some(week => week.some(day => day && day.hasReading));
      });

    return yearlyGrids;
  };

  const yearlyGridData = generateGridData();

  return (
    <section className="mb-12" data-testid="reading-timeline-section">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-primary">Reading Timeline</h2>
        {canShowGridView && (
          <Select value={timeRange} onValueChange={onTimeRangeChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      <Card>
        <CardContent className="p-6">
          {/* Book Legend */}
          <div className="flex flex-wrap items-center gap-4 mb-6 pb-4 border-b border-gray-100">
            {booksWithSessionsInRange.map(book => (
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
              <div className="flex flex-col items-center" data-testid="grid-view">
                {yearlyGridData && yearlyGridData.length > 0 ? (
                  yearlyGridData.map(({ year, weeks, monthLabels }) => (
                    <div key={year} className="mb-8 last:mb-0">
                      <h3 className="text-lg font-semibold text-center mb-4">{year}</h3>
                      <div className="space-y-4">
                        {/* Month Labels */}
                        <div className="flex text-xs text-gray-600 dark:text-gray-400 mb-2">
                          <div className="w-8"></div>
                          <div className="relative flex-1">
                            {monthLabels.map((label, i) => (
                              <div
                                key={i}
                                className="text-xs text-gray-600 dark:text-gray-400"
                                style={{
                                  position: 'absolute',
                                  left: `${label.left}px`
                                }}
                              >
                                {label.month}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Grid with Day Labels */}
                        <div className="flex">
                          {/* Day of Week Labels */}
                          <div className="flex flex-col">
                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                              <div key={i} className="w-8 h-3 mb-1 text-xs text-gray-500 text-right pr-2 flex items-center justify-end">
                                {day}
                              </div>
                            ))}
                          </div>

                          {/* Grid */}
                          <div className="flex">
                            {weeks.map((week, weekIndex) => (
                              <div key={weekIndex} className="flex flex-col">
                                {week.map((day, dayIndex) => {
                                  // Performance optimization: Optimize color array access with single null check
                                  // Prevents multiple undefined checks throughout the gradient logic
                                  const colors = day.colors || [];
                                  const count = colors.length;

                                  // Determine background style based on number of books
                                  // Includes defensive fallbacks for null/undefined colors
                                  let backgroundStyle: React.CSSProperties['background'];
                                  
                                  if (day.isEmpty) {
                                    backgroundStyle = 'transparent';
                                  } else if (count === 0) {
                                    // No books read today - show gray placeholder
                                    backgroundStyle = '#f3f4f6';
                                  } else if (count === 1) {
                                    // Single book - show its color or fallback to gray
                                    backgroundStyle = colors[0] || '#f3f4f6';
                                  } else if (count === 2) {
                                    // Two books - 50/50 split gradient with color fallbacks
                                    backgroundStyle = `linear-gradient(45deg, ${colors[0] || '#f3f4f6'} 50%, ${colors[1] || '#f3f4f6'} 50%)`;
                                  } else if (count === 3) {
                                    // Three books - 120deg gradient with color fallbacks
                                    backgroundStyle = `linear-gradient(120deg, ${colors[0] || '#f3f4f6'} 33.33%, ${colors[1] || '#f3f4f6'} 33.33% 66.66%, ${colors[2] || '#f3f4f6'} 66.66%)`;
                                  } else {
                                    // 4+ books: show first 4 colors to keep gradient manageable
                                    // Shows first 4 colors with 90deg gradient (25% each)
                                    // Uses gray fallback for any missing colors
                                    backgroundStyle = `linear-gradient(90deg, ${colors[0] || '#f3f4f6'} 25%, ${colors[1] || '#f3f4f6'} 25% 50%, ${colors[2] || '#f3f4f6'} 50% 75%, ${colors[3] || '#f3f4f6'} 75%)`;
                                  }

                                  return (
                                    <div
                                      key={dayIndex}
                                      className={`w-3 h-3 rounded-sm mb-1 mr-1 border border-gray-200 ${editModeBookId && !day.isEmpty && day.date ? 'cursor-pointer hover:border-blue-400' : ''}`}
                                      style={{ background: backgroundStyle }}
                                      title={day.isEmpty ? '' : day.dateTitle}
                                      onClick={() => handleGridCellClick(day)}
                                    ></div>
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    No reading sessions recorded for this period.
                  </div>
                )}

                {/* Grid Interaction Hints */}
                {yearlyGridData && yearlyGridData.length > 0 && (
                  <div className="flex items-center justify-center mt-4 text-xs text-gray-600 dark:text-gray-400">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-4 h-4" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Each square represents a day</p>
                          <p>Multiple colors show different books read</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}
              </div>
            ) : (
              /* Original Ribbon View */
              <div data-testid="ribbon-view">
                {/* Date Labels */}
                <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-4">
                  {getDateLabels().map((label, i) => (
                    <span key={i}>{label}</span>
                  ))}
                </div>

                {/* Timeline Ribbons */}
                <div className="space-y-3">
                  {booksWithSessionsInRange.map(book => {
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
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-4 h-4" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Darker sections indicate reading days</p>
                        <p>Lighter sections show gaps</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
