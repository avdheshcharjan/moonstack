import { useState, useEffect } from 'react';

/**
 * Generic localStorage hook with JSON serialization/deserialization
 * Reconstructs Date objects if present in stored data
 * Handles corrupted data and quota exceeded errors
 *
 * @param key - localStorage key
 * @param initialValue - initial value if no stored data exists
 * @returns tuple of [value, setValue]
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = localStorage.getItem(key);
      if (!item) {
        return initialValue;
      }

      const parsed = JSON.parse(item);
      return reconstructDates(parsed);
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = (value: T) => {
    try {
      setStoredValue(value);

      if (typeof window !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'QuotaExceededError') {
          throw new Error('localStorage quota exceeded. Please clear some data.');
        }
      }
      throw new Error(`Failed to save to localStorage: ${error}`);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const item = localStorage.getItem(key);
      if (item) {
        const parsed = JSON.parse(item);
        setStoredValue(reconstructDates(parsed));
      }
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
    }
  }, [key]);

  return [storedValue, setValue];
}

/**
 * Recursively reconstructs Date objects from ISO strings in parsed JSON
 * Handles nested objects and arrays
 */
function reconstructDates<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    if (isoDateRegex.test(data)) {
      return new Date(data) as T;
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => reconstructDates(item)) as T;
  }

  if (typeof data === 'object') {
    const reconstructed: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      reconstructed[key] = reconstructDates(value);
    }
    return reconstructed as T;
  }

  return data;
}
