"use client";
import React, { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/maps/google";
import { MapPin, Navigation, Search } from "lucide-react";

interface LocationPickerProps {
  initialLat?: number;
  initialLng?: number;
  onSelect: (coords: { lat: number; lng: number; address: string; city?: string; pincode?: string }) => void;
}

export function LocationPicker({
  initialLat = 22.5726,
  initialLng = 88.3639,
  onSelect,
}: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [coords, setCoords] = useState({ lat: initialLat, lng: initialLng });
  const [address, setAddress] = useState("Move pin or search location");
  const [mapsError, setMapsError] = useState<string | null>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markerInstance = useRef<google.maps.Marker | null>(null);

  const reverseGeocode = async (lat: number, lng: number, g: typeof google) => {
    try {
      const geocoder = new g.maps.Geocoder();
      const res = await geocoder.geocode({ location: { lat, lng } });
      const first = res.results?.[0];
      const formatted = first?.formatted_address ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      const cityComp = first?.address_components?.find((c: { types: string[] }) => c.types.includes("locality"));
      const pinComp = first?.address_components?.find((c: { types: string[] }) => c.types.includes("postal_code"));
      setAddress(formatted);
      onSelect({
        lat,
        lng,
        address: formatted,
        city: cityComp?.long_name,
        pincode: pinComp?.long_name,
      });
    } catch {
      const fallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      setAddress(fallback);
      onSelect({ lat, lng, address: fallback });
    }
  };

  useEffect(() => {
    let mounted = true;
    loadGoogleMaps()
      .then((g) => {
        if (!mounted || !mapRef.current) return;
        const map = new g.maps.Map(mapRef.current, {
          center: coords,
          zoom: 15,
          disableDefaultUI: true,
          zoomControl: true,
        });
        const marker = new g.maps.Marker({
          position: coords,
          map,
          draggable: true,
        });
        mapInstance.current = map;
        markerInstance.current = marker;

        marker.addListener("dragend", () => {
          const pos = marker.getPosition();
          if (!pos) return;
          const lat = pos.lat();
          const lng = pos.lng();
          setCoords({ lat, lng });
          reverseGeocode(lat, lng, g);
        });

        map.addListener("click", (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return;
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          marker.setPosition({ lat, lng });
          setCoords({ lat, lng });
          reverseGeocode(lat, lng, g);
        });

        if (inputRef.current) {
          const ac = new g.maps.places.Autocomplete(inputRef.current, {
            fields: ["geometry", "formatted_address", "address_components"],
          });
          ac.addListener("place_changed", () => {
            const place = ac.getPlace();
            const loc = place.geometry?.location;
            if (!loc) return;
            const lat = loc.lat();
            const lng = loc.lng();
            map.setCenter({ lat, lng });
            marker.setPosition({ lat, lng });
            setCoords({ lat, lng });
            const formatted = place.formatted_address ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
            const cityComp = place.address_components?.find((c: { types: string[] }) => c.types.includes("locality"));
            const pinComp = place.address_components?.find((c: { types: string[] }) => c.types.includes("postal_code"));
            setAddress(formatted);
            onSelect({
              lat,
              lng,
              address: formatted,
              city: cityComp?.long_name,
              pincode: pinComp?.long_name,
            });
          });
        }
      })
      .catch((err) => {
        if (mounted) setMapsError(err.message);
      });

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const detectGPS = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });
        if (mapInstance.current && markerInstance.current) {
          mapInstance.current.setCenter({ lat, lng });
          markerInstance.current.setPosition({ lat, lng });
          if (window.google) await reverseGeocode(lat, lng, window.google);
        } else {
          const fallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          setAddress(fallback);
          onSelect({ lat, lng, address: fallback });
        }
      },
      () => setMapsError("Location permission denied")
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search area, street, landmark..."
            className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <button
          type="button"
          onClick={detectGPS}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
        >
          <Navigation className="w-4 h-4" />
          GPS
        </button>
      </div>

      {mapsError ? (
        <div className="p-4 border rounded-lg bg-amber-50 text-amber-800 text-xs space-y-2">
          <p className="font-medium">Map unavailable ({mapsError}). Enter coordinates manually:</p>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              step="0.0001"
              value={coords.lat}
              onChange={(e) => {
                const lat = Number(e.target.value);
                setCoords((c) => ({ ...c, lat }));
                onSelect({ lat, lng: coords.lng, address: `${lat}, ${coords.lng}` });
              }}
              className="border rounded px-2 py-1 bg-white"
              placeholder="Latitude"
            />
            <input
              type="number"
              step="0.0001"
              value={coords.lng}
              onChange={(e) => {
                const lng = Number(e.target.value);
                setCoords((c) => ({ ...c, lng }));
                onSelect({ lat: coords.lat, lng, address: `${coords.lat}, ${lng}` });
              }}
              className="border rounded px-2 py-1 bg-white"
              placeholder="Longitude"
            />
          </div>
        </div>
      ) : (
        <div ref={mapRef} className="w-full h-56 rounded-xl border bg-gray-100" />
      )}

      <div className="flex items-start gap-2 text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg border">
        <MapPin className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
        <span className="line-clamp-2">{address}</span>
      </div>
    </div>
  );
}
