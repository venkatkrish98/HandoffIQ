import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from './api';

export interface Async<T> { data: T | null; error: string | null; loading: boolean; reload: () => void; set: (v: T) => void }

/** Load data from a resolver, exposing loading / error / reload. Ignores stale responses. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): Async<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const tick = useRef(0);
  const run = useCallback(() => {
    const mine = ++tick.current;
    setLoading(true);
    setError(null);
    fn()
      .then((d) => { if (mine === tick.current) setData(d); })
      .catch((e) => { if (mine === tick.current) setError(e instanceof ApiError ? e.message : 'Could not load data.'); })
      .finally(() => { if (mine === tick.current) setLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(run, [run]);
  return { data, error, loading, reload: run, set: setData };
}

export const msg = (e: unknown) => (e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
