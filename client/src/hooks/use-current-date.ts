import { useState, useEffect } from 'react';

/**
 * A hook that provides the current date and updates it periodically.
 * This ensures that components using this hook will re-render on date changes,
 * which is useful for keeping date-sensitive UI like timelines in sync.
 * @returns The current date.
 */
export function useCurrentDate() {
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    // Update the date every minute to catch date changes
    const intervalId = setInterval(() => {
      setCurrentDate(new Date());
    }, 60 * 1000);

    return () => clearInterval(intervalId);
  }, []);

  return currentDate;
}
