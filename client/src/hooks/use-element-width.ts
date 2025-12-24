import { useState, useEffect, RefObject } from 'react';

export function useElementWidth(elementRef: RefObject<HTMLElement>): number {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!elementRef.current) {
      return;
    }

    const resizeObserver = new ResizeObserver(entries => {
      if (!entries || entries.length === 0) {
        return;
      }
      setWidth(entries[0].contentRect.width);
    });

    resizeObserver.observe(elementRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [elementRef]);

  return width;
}
