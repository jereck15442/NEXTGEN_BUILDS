import { useEffect, useState } from 'react';
import { apiClient } from '../api/client.js';

export const useFetch = ({ url, method = 'get', params, body, enabled = true }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);

  const paramsKey = params ? JSON.stringify(params) : '';
  const bodyKey = body ? JSON.stringify(body) : '';

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();

    setLoading(true);
    setError(null);

    apiClient({ method, url, params, data: body, signal: controller.signal })
      .then((response) => {
        if (controller.signal.aborted) return;
        setData(response.data);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err?.message || 'Request failed');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [url, method, paramsKey, bodyKey, enabled]);

  return { data, loading, error };
};
