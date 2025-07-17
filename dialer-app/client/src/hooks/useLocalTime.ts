import { useState, useEffect, useRef } from 'react';
import { getTimezoneFromZipCode, formatTimeInTimezone } from '../utils/timezoneUtils';

/**
 * Custom hook to get and update the local time based on a zip code
 * @param zipCode The zip code to determine timezone from
 * @returns The current time formatted for the timezone of the zip code
 */
export const useLocalTime = (zipCode: string | undefined): string => {
  // Store the formatted time
  const [time, setTime] = useState<string>('');

  // Store the error status to avoid repeated error logging
  const hasErrorRef = useRef<boolean>(false);

  // Use a ref to track mounted state to prevent memory leaks
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    try {
      // Get the timezone for this zip code
      const timezone = getTimezoneFromZipCode(zipCode);

      // Set initial time
      setTime(formatTimeInTimezone(timezone));

      // Update every minute
      const intervalId = setInterval(() => {
        if (isMountedRef.current) {
          try {
            setTime(formatTimeInTimezone(timezone));
            // Reset error flag if successful
            if (hasErrorRef.current) {
              hasErrorRef.current = false;
            }
          } catch (error) {
            // Only log once per error occurrence
            if (!hasErrorRef.current) {
              console.error('Error updating time in useLocalTime:', error);
              hasErrorRef.current = true;
            }
          }
        }
      }, 60000); // Update every minute

      // Cleanup function to clear the interval when the component unmounts
      return () => {
        clearInterval(intervalId);
      };
    } catch (error) {
      console.error('Error in useLocalTime hook:', error);
      // Set a fallback time on error
      setTime(
        new Date().toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
      );
    }

    // Cleanup function to update the mounted ref
    return () => {
      isMountedRef.current = false;
    };
  }, [zipCode]); // Only re-run if zip code changes

  return time;
};

export default useLocalTime;
