import { useQuery } from "@tanstack/react-query";
import { useCurrentDate } from "@/hooks/use-current-date";
import { toLocalDateString } from "@/lib/date-utils";
import { BookOpen, Calendar, Clock } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

interface Statistics {
  streak: number;
  avgPages: number;
  totalPages: number;
  pagesRemaining: number;
  avgPagesPerBook: number;
  booksPerYear: number;
}

export default function StatisticsWidget() {
  const currentDate = useCurrentDate();

  const { data: stats } = useQuery<Statistics>({
    queryKey: ["/api/stats", toLocalDateString(currentDate)],
    queryFn: async () => {
      const today = toLocalDateString(currentDate);
      const response = await fetch(`/api/stats?today=${today}`);
      if (!response.ok) throw new Error("Failed to fetch statistics");
      return response.json();
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  if (!stats) {
    return null;
  }

  // Format statistics for display
  const formatStat = (value: number | undefined, suffix: string) => {
    const num = value ?? 0;
    if (suffix === "pg" && num >= 1000) {
      return `${(num / 1000).toFixed(1)}k${suffix}`;
    }
    return `${num}${suffix}`;
  };

  return (
    <div className="flex items-center space-x-3 text-sm">
      {/* Average pages per day */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center space-x-1 text-gray-700 dark:text-gray-300">
            <Clock className="w-4 h-4 text-purple-500" />
            <span className="font-medium">
              {formatStat(stats.avgPages, "pg/day")}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Average number of pages read each day</p>
        </TooltipContent>
      </Tooltip>

      {/* Total pages read */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center space-x-1 text-gray-700 dark:text-gray-300">
            <BookOpen className="w-4 h-4 text-green-500" />
            <span className="font-medium">
              {formatStat(stats.totalPages, "pg")}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Total number of pages read across all completed books</p>
        </TooltipContent>
      </Tooltip>

      {/* Books per year */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center space-x-1 text-gray-700 dark:text-gray-300">
            <Calendar className="w-4 h-4 text-cyan-500" />
            <span className="font-medium">
              {formatStat(stats.booksPerYear, "books/yr")}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Estimated number of books you'll complete this year based on your reading pace</p>
        </TooltipContent>
      </Tooltip>

      {/* Pages remaining in currently-reading books */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center space-x-1 text-gray-700 dark:text-gray-300">
            <BookOpen className="w-4 h-4 text-orange-500" />
            <span className="font-medium">
              {formatStat(stats.pagesRemaining, "pg")}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Number of pages left to read in your currently-reading books</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
