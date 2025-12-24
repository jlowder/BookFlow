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

  // When the view mode changes, adjust the time range if necessary
  useEffect(() => {
    // If we can show the grid view and the user is on the default mobile view,
    // switch to a longer time range that uses the grid.
    if (canShowGridView && timeRange === '30') {
      onTimeRangeChange('365');
    }

    // If we can no longer show the grid view, switch back to the mobile-friendly
    // ribbon view.
    if (!canShowGridView) {
      onTimeRangeChange('30');
    }
  }, [canShowGridView, timeRange, onTimeRangeChange]);

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

    // Group timeline data by year
    const dataByYear: { [year: number]: any[] } = {};
    timelineData.forEach(day => {
      const year = new Date(day.date + 'T00:00:00').getFullYear();
      if (!dataByYear[year]) {
        dataByYear[year] = [];
      }
      dataByYear[year].push(day);
    });

    const yearlyGrids = Object.entries(dataByYear)
      .sort(([yearA], [yearB]) => parseInt(yearA) - parseInt(yearB))
      .map(([year, yearData]) => {
        // Check if there are any reading sessions for this year
        const hasReadingDays = yearData.some((day: any) => day.hasReading);
        if (!hasReadingDays) {
          return null;
        }

        const startDateStr = yearData[0].date;
        const endDateStr = yearData[yearData.length - 1].date;
        const gridDataStartDate = new Date(startDateStr + 'T00:00:00');
        const gridDataEndDate = new Date(endDateStr + 'T00:00:00');

        // Find the Sunday before our start date
        const gridStartDate = new Date(gridDataStartDate);
        gridStartDate.setDate(gridDataStartDate.getDate() - gridDataStartDate.getDay());

        // Generate weeks
        const weeks: any[][] = [];
        const monthLabels: { month: string; weekIndex: number }[] = [];
        let currentDate = new Date(gridStartDate);
        let currentMonth = -1;
        let weekIndex = 0;

        while (currentDate <= gridDataEndDate) {
          const week: any[] = new Array(7).fill(null);

          for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
            if (currentDate >= gridDataStartDate && currentDate <= gridDataEndDate && currentDate.getMonth() !== currentMonth) {
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
              const dayBooks = uniqueBookIds.map(id => books.find(b => b.id === id)).filter(Boolean) as Book[];
              const colors = dayBooks.map(b => b.color);

              week[actualDayOfWeek] = { date: dateStr, isEmpty: false, sessions: dayData.sessions, colors, hasReading: dayData.hasReading };
            } else {
              const isInRange = currentDate >= gridDataStartDate && currentDate <= gridDataEndDate;
              week[actualDayOfWeek] = { date: isInRange ? dateStr : '', isEmpty: !isInRange, sessions: [], colors: [], hasReading: false };
            }

            currentDate.setDate(currentDate.getDate() + 1);
          }

          for (let i = 0; i < 7; i++) {
            if (week[i] === null) {
              week[i] = { date: '', isEmpty: true, sessions: [], colors: [], hasReading: false };
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
      .filter(Boolean);

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
              <SelectItem value="365">12 months</SelectItem>
              <SelectItem value="730">24 months</SelectItem>
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
                                {week.map((day, dayIndex) => (
                                  <div
                                    key={dayIndex}
                                    className={`w-3 h-3 rounded-sm mb-1 mr-1 border border-gray-200 ${editModeBookId && !day.isEmpty && day.date ? 'cursor-pointer hover:border-blue-400' : ''}`}
                                    style={{
                                      background: day.isEmpty
                                        ? 'transparent'
                                        : day.colors.length === 0
                                          ? '#f3f4f6'
                                          : day.colors.length === 1
                                            ? day.colors[0]
                                            : day.colors.length === 2
                                              ? `linear-gradient(45deg, ${day.colors[0]} 50%, ${day.colors[1]} 50%)`
                                              : `linear-gradient(120deg, ${day.colors[0]} 33.33%, ${day.colors[1]} 33.33% 66.66%, ${day.colors[2]} 66.66%)`
                                    }}
                                    title={day.isEmpty ? '' : new Date(day.date + 'T00:00:00').toLocaleDateString()}
                                    onClick={() => handleGridCellClick(day)}
                                  ></div>
                                ))}
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
