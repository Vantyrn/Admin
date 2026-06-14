"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, AlertTriangle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';

const containerStyle = { width: '100%', height: '100%' };
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const defaultPos = { lat: 28.6139, lng: 77.2090 }; // New Delhi

// NOTE on the google.maps.Marker deprecation warning: migrating to
// AdvancedMarkerElement requires (1) a vector Map ID and (2) ALL map loaders in
// the app (VendorMap, LiveTrackingMap, this picker) to share identical
// useJsApiLoader options (same id + libraries) — otherwise @react-google-maps/api
// throws "Loader must not be called again with different options". Until that
// app-wide unification is done, we keep the classic (still-supported) Marker and
// the SAME loader options as the other maps. The warning is non-breaking.

function getInitialPos(latitude, longitude) {
  if (latitude && longitude) {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
  }
  return defaultPos;
}

/**
 * Interactive Google Map. Mounted ONLY when an API key is configured — that way
 * useJsApiLoader never injects a keyless script (which produced the
 * ApiProjectMapError / REQUEST_DENIED console errors).
 */
function MapPicker({ latitude, longitude, onLocationChange, onAddressChange }) {
  // IMPORTANT: keep these options identical to VendorMap / LiveTrackingMap
  // (same id, no `libraries`) so the shared loader isn't re-initialized.
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  const [address, setAddress] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [position, setPosition] = useState(getInitialPos(latitude, longitude));

  // Debounced reverse geocoding
  useEffect(() => {
    if (!position.lat || !position.lng || !isLoaded) return;
    const timeoutId = setTimeout(() => reverseGeocode(position.lat, position.lng), 1000);
    return () => clearTimeout(timeoutId);
  }, [position.lat, position.lng, isLoaded]);

  useEffect(() => {
    if (latitude && longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      if (!isNaN(lat) && !isNaN(lng) && (lat !== position.lat || lng !== position.lng)) {
        setPosition({ lat, lng });
      }
    }
  }, [latitude, longitude]);

  useEffect(() => {
    onLocationChange(position.lat, position.lng);
  }, [position.lat, position.lng]);

  const reverseGeocode = (lat, lng) => {
    if (!window.google) return;
    setIsGeocoding(true);
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === "OK" && results[0]) {
        setAddress(results[0].formatted_address);
        if (onAddressChange) onAddressChange(results[0].formatted_address);
      } else {
        // Most commonly REQUEST_DENIED when the Geocoding API isn't enabled for the key.
        console.warn("Reverse geocoding unavailable: " + status);
      }
      setIsGeocoding(false);
    });
  };

  const handleMapLocationChange = useCallback((lat, lng) => setPosition({ lat, lng }), []);
  const onMarkerDragEnd = useCallback((e) => handleMapLocationChange(e.latLng.lat(), e.latLng.lng()), [handleMapLocationChange]);
  const onMapClick = useCallback((e) => handleMapLocationChange(e.latLng.lat(), e.latLng.lng()), [handleMapLocationChange]);

  const handleCurrentLocation = (e) => {
    e.preventDefault();
    if (!navigator.geolocation) { alert("Geolocation is not supported by your browser"); return; }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { handleMapLocationChange(pos.coords.latitude, pos.coords.longitude); setIsLocating(false); },
      (error) => { console.error("Error getting location:", error); alert("Unable to retrieve your location"); setIsLocating(false); }
    );
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <Label className="font-bold text-zinc-700 flex items-center gap-1">
          <MapPin className="w-4 h-4 text-swiggy-orange" /> Location Picker *
        </Label>
        <Button type="button" variant="outline" size="sm" onClick={handleCurrentLocation} disabled={isLocating}
          className="h-8 text-xs font-bold gap-1 rounded-lg border-swiggy-orange text-swiggy-orange hover:bg-swiggy-orange hover:text-white transition-colors">
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
          <GoogleMap mapContainerStyle={containerStyle} center={position} zoom={15} onClick={onMapClick}
            options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}>
            <Marker position={position} draggable={true} onDragEnd={onMarkerDragEnd} />
          </GoogleMap>
        )}
      </div>

      {address && (
        <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-200 text-sm text-zinc-600 flex items-start gap-2">
          <MapPin className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
          <span className="font-medium">{isGeocoding ? 'Fetching address...' : address}</span>
        </div>
      )}
    </>
  );
}

/**
 * Fallback when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not configured: manual
 * latitude/longitude entry so a vendor can still be onboarded without Maps.
 */
function ManualLatLng({ latitude, longitude, onLocationChange }) {
  const init = getInitialPos(latitude, longitude);
  const [lat, setLat] = useState(latitude ?? init.lat);
  const [lng, setLng] = useState(longitude ?? init.lng);

  useEffect(() => {
    const la = parseFloat(lat); const ln = parseFloat(lng);
    if (!isNaN(la) && !isNaN(ln)) onLocationChange(la, ln);
  }, [lat, lng]);

  return (
    <>
      <Label className="font-bold text-zinc-700 flex items-center gap-1">
        <MapPin className="w-4 h-4 text-swiggy-orange" /> Location (manual entry) *
      </Label>
      <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg p-3 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        <span>
          Google Maps is not configured (<code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> missing).
          Enter coordinates manually for now. Tip: copy them from Google Maps (right-click a spot → the lat,lng at the top).
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-zinc-500">Latitude</Label>
          <Input type="number" step="any" placeholder="28.6139" value={lat} onChange={(e) => setLat(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-zinc-500">Longitude</Label>
          <Input type="number" step="any" placeholder="77.2090" value={lng} onChange={(e) => setLng(e.target.value)} />
        </div>
      </div>
    </>
  );
}

export default function LocationPicker({ latitude, longitude, onLocationChange, onAddressChange }) {
  return (
    <div className="space-y-3 col-span-2">
      {GOOGLE_MAPS_API_KEY ? (
        <MapPicker latitude={latitude} longitude={longitude} onLocationChange={onLocationChange} onAddressChange={onAddressChange} />
      ) : (
        <ManualLatLng latitude={latitude} longitude={longitude} onLocationChange={onLocationChange} />
      )}

      {/* Hidden inputs to keep the form validation working if they are required */}
      <input type="hidden" name="latitude" value={latitude || ""} required />
      <input type="hidden" name="longitude" value={longitude || ""} required />
    </div>
  );
}
