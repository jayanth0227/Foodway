/**
 * High-Performance Dual-Phase Geolocation & Reverse Geocoding Utility
 * Provides instant location feedback (< 500ms) and refines to high precision.
 */

export interface FastLocationResult {
  latitude: number;
  longitude: number;
  isHighAccuracy: boolean;
}

export interface AddressDetails {
  street?: string;
  area?: string;
  city?: string;
  state?: string;
  pincode?: string;
  formattedAddress?: string;
}

/**
 * Dual-Phase GPS Detection:
 * 1. Immediate Fast Location (Network/Cell Tower/WiFi - ~300ms)
 * 2. Precise Satellite GPS refinement
 */
export const getFastAndAccurateLocation = (
  onLocationFound: (result: FastLocationResult) => void,
  onError?: (errorMessage?: string) => void
) => {
  if (!navigator.geolocation) {
    // Fallback to IP Geolocation if browser doesn't support Geolocation API
    fetchIpLocation(onLocationFound, onError);
    return;
  }

  let locationAcquired = false;

  // Phase 1: Fast Location Fix
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      locationAcquired = true;
      onLocationFound({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        isHighAccuracy: false
      });
    },
    (err) => {
      console.warn('Fast location attempt warning:', err.message);
    },
    { enableHighAccuracy: false, timeout: 6000, maximumAge: 60000 }
  );

  // Phase 2: High Accuracy Satellite Fix
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      locationAcquired = true;
      onLocationFound({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        isHighAccuracy: true
      });
    },
    (err) => {
      console.warn('High accuracy GPS fix warning:', err.message);
      if (!locationAcquired) {
        // Fallback to IP Geolocation API if browser GPS permissions denied or timeout
        fetchIpLocation(onLocationFound, () => {
          if (onError) {
            if (err.code === err.PERMISSION_DENIED) {
              onError('Location access denied in browser. Please enable location permissions or pick on map.');
            } else {
              onError('GPS signal weak. Click anywhere on the map to set your location.');
            }
          }
        });
      }
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
};

// IP Geolocation Fallback Helper
const fetchIpLocation = async (
  onLocationFound: (result: FastLocationResult) => void,
  onError?: (errorMessage?: string) => void
) => {
  try {
    const res = await fetch('https://ipapi.co/json/');
    const data = await res.json();
    if (data && data.latitude && data.longitude) {
      onLocationFound({
        latitude: parseFloat(data.latitude),
        longitude: parseFloat(data.longitude),
        isHighAccuracy: false
      });
      return;
    }
  } catch (e) {
    console.warn('IP location fallback failed:', e);
  }
  if (onError) onError();
};

/**
 * Fast Reverse Geocoding with AbortController timeout & fallback provider
 */
export const fastReverseGeocode = async (
  latitude: number,
  longitude: number
): Promise<AddressDetails | null> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);

  try {
    // Primary: OpenStreetMap Nominatim API
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&accept-language=en`,
      {
        signal: controller.signal,
        headers: { 'Accept-Language': 'en-US,en;q=0.9' }
      }
    );
    clearTimeout(timeoutId);

    const data = await response.json();
    if (data && data.address) {
      const addr = data.address;
      const road = addr.road || addr.residential || addr.pedestrian || addr.street || addr.subdivision || '';
      const houseNo = addr.house_number || addr.building || '';
      const combinedStreet = [houseNo, road].filter(Boolean).join(', ');

      return {
        street: combinedStreet || addr.display_name?.split(',')[0] || '',
        area: addr.suburb || addr.neighbourhood || addr.residential || addr.commercial || '',
        city: addr.city || addr.town || addr.village || addr.county || '',
        state: addr.state || 'Andhra Pradesh',
        pincode: addr.postcode || '',
        formattedAddress: data.display_name || ''
      };
    }
  } catch (err) {
    console.warn('Primary Nominatim geocode timed out/failed, trying fallback...', err);
  } finally {
    clearTimeout(timeoutId);
  }

  // Fallback Provider: BigDataCloud Free Reverse Geocoding API
  try {
    const fallbackRes = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
    );
    const fallbackData = await fallbackRes.json();
    if (fallbackData) {
      return {
        street: fallbackData.locality || fallbackData.name || '',
        area: fallbackData.principalSubdivisionCode || fallbackData.locality || '',
        city: fallbackData.city || fallbackData.locality || '',
        state: fallbackData.principalSubdivision || '',
        pincode: fallbackData.postcode || '',
        formattedAddress: `${fallbackData.locality}, ${fallbackData.city}, ${fallbackData.principalSubdivision}`
      };
    }
  } catch (fallbackErr) {
    console.warn('Fallback geocoding error:', fallbackErr);
  }

  return null;
};
