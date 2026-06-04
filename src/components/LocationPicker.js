"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: '100%'
};

export default function LocationPicker({ latitude, longitude, onLocationChange, onAddressChange }) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  });

  const [address, setAddress] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

  const defaultPos = { lat: 28.6139, lng: 77.2090 }; // Default to New Delhi
  
  const getInitialPos = () => {
    if (latitude && longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
    }
    return defaultPos;
  };

  const [position, setPosition] = useState(getInitialPos());

  // Debounced reverse geocoding
  useEffect(() => {
    if (!position.lat || !position.lng || !isLoaded) return;
    
    const timeoutId = setTimeout(() => {
      reverseGeocode(position.lat, position.lng);
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [position.lat, position.lng, isLoaded]);

  // Sync position state with props if they change externally
  useEffect(() => {
    if (latitude && longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      if (!isNaN(lat) && !isNaN(lng) && (lat !== position.lat || lng !== position.lng)) {
        setPosition({ lat, lng });
      }
    }
  }, [latitude, longitude]);

  // Initial trigger for onLocationChange
  useEffect(() => {
    onLocationChange(position.lat, position.lng);
  }, [position.lat, position.lng]);

  const reverseGeocode = (lat, lng) => {
    if (!window.google) return;
    setIsGeocoding(true);
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === "OK" && results[0]) {
        const formattedAddress = results[0].formatted_address;
        setAddress(formattedAddress);
        if (onAddressChange) onAddressChange(formattedAddress);
      } else {
        console.error("Geocoder failed due to: " + status);
      }
      setIsGeocoding(false);
    });
  };

  const handleMapLocationChange = useCallback((lat, lng) => {
    setPosition({ lat, lng });
  }, []);

  const onMarkerDragEnd = useCallback((e) => {
    handleMapLocationChange(e.latLng.lat(), e.latLng.lng());
  }, [handleMapLocationChange]);

  const onMapClick = useCallback((e) => {
    handleMapLocationChange(e.latLng.lat(), e.latLng.lng());
  }, [handleMapLocationChange]);

  const handleCurrentLocation = (e) => {
    e.preventDefault();
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        handleMapLocationChange(lat, lng);
        setIsLocating(false);
      },
      (error) => {
        console.error("Error getting location:", error);
        alert("Unable to retrieve your location");
        setIsLocating(false);
      }
    );
  };

  return (
    <div className="space-y-3 col-span-2">
      <div className="flex items-center justify-between">
        <Label className="font-bold text-zinc-700 flex items-center gap-1">
          <MapPin className="w-4 h-4 text-swiggy-orange" /> Location Picker *
        </Label>
        <Button 
          type="button"
          variant="outline" 
          size="sm" 
          onClick={handleCurrentLocation}
          disabled={isLocating}
          className="h-8 text-xs font-bold gap-1 rounded-lg border-swiggy-orange text-swiggy-orange hover:bg-swiggy-orange hover:text-white transition-colors"
        >
          <Navigation className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`} />
          {isLocating ? 'Locating...' : 'Use Current Location'}
        </Button>
      </div>

      <div className="h-[300px] w-full rounded-xl overflow-hidden border border-zinc-200 z-10 relative">
        {!isLoaded ? (
          <div className="h-full w-full bg-zinc-100 animate-pulse flex items-center justify-center text-zinc-400 font-medium">
            Loading Google Maps...
          </div>
        ) : (
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={position}
            zoom={15}
            onClick={onMapClick}
            options={{
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: false,
            }}
          >
            <Marker
              position={position}
              draggable={true}
              onDragEnd={onMarkerDragEnd}
            />
          </GoogleMap>
        )}
      </div>

      {address && (
        <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-200 text-sm text-zinc-600 flex items-start gap-2">
          <MapPin className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
          <span className="font-medium">{isGeocoding ? 'Fetching address...' : address}</span>
        </div>
      )}

      {/* Hidden inputs to keep the form validation working if they are required */}
      <input type="hidden" name="latitude" value={latitude || ""} required />
      <input type="hidden" name="longitude" value={longitude || ""} required />
    </div>
  );
}
