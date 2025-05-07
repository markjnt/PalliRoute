import { useState, useEffect } from 'react';

export const useGoogleMapsLoader = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const checkGoogleMaps = () => {
      if (window.google && window.google.maps && window.google.maps.LatLng) {
        setIsLoaded(true);
      }
    };

    // Initial check
    checkGoogleMaps();

    // Set up interval to check periodically
    const interval = setInterval(checkGoogleMaps, 100);

    // Cleanup
    return () => clearInterval(interval);
  }, []);

  return isLoaded;
}; 