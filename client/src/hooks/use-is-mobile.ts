import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 2200; // Increased breakpoint for larger mobile devices, like foldables

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // window.matchMedia is not available on the server, useEffect handles this, but this is an extra guard
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);

    // Set the initial state based on the media query
    setIsMobile(mediaQuery.matches);

    // Create a listener for changes to the media query
    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };

    // Add the listener, with a fallback for older browsers
    try {
        mediaQuery.addEventListener('change', handleChange);
    } catch (e) {
        mediaQuery.addListener(handleChange);
    }

    // Cleanup function to remove the listener
    return () => {
      try {
        mediaQuery.removeEventListener('change', handleChange);
      } catch (e) {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []); // Empty dependency array ensures this effect runs only once on mount and unmount

  return isMobile;
}
