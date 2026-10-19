import { useCallback, useEffect, useState } from 'react';
import { getErrorMessage } from '../services/api';

// Loads data with `fetcher()` and reloads whenever `key` changes.
// Returns { data, error, loading, reload, setData }.
//
//   const { data, loading, error } = useFetch(() => recipeApi.get(id), id);
export default function useFetch(fetcher, key) {
  const [state, setState] = useState({ data: null, error: '', loading: true });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let ignore = false; // ignore answers that arrive after the key changed
    setState((current) => ({ ...current, loading: true, error: '' }));

    fetcher()
      .then((data) => {
        if (!ignore) setState({ data, error: '', loading: false });
      })
      .catch((error) => {
        if (!ignore) setState({ data: null, error: getErrorMessage(error), loading: false });
      });

    return () => {
      ignore = true;
    };
    // `fetcher` is a new function every render; `key` says when to refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  const setData = useCallback(
    (update) => setState((current) => ({
      ...current,
      data: typeof update === 'function' ? update(current.data) : update,
    })),
    []
  );

  return { ...state, reload, setData };
}
