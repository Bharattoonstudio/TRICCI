import { useEffect, useState } from 'react';

/**
 * Hook that returns true once hydration is complete.
 * Use this to suppress content that depends on browser-only state during SSR.
 */
export function useHydrationReady() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
  }, []);

  return isReady;
}
