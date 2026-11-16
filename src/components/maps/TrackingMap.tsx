"use client";
import React, { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/maps/google";

interface TrackingMapProps {
  storeLat?: number;
  storeLng?: number;
  dropLat?: number;
  dropLng?: number;
  riderLat?: number | null;
  riderLng?: number | null;
}

export function TrackingMap({
  storeLat = 22.5726,
  storeLng = 88.3639,
  dropLat = 22.578,
  dropLng = 88.37,
  riderLat,
  riderLng,
}: TrackingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const riderMarkerRef = useRef<google.maps.Marker | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    loadGoogleMaps()
      .then((g) => {
        if (!mounted || !mapRef.current) return;
        const map = new g.maps.Map(mapRef.current, {
          center: { lat: (storeLat + dropLat) / 2, lng: (storeLng + dropLng) / 2 },
          zoom: 14,
          disableDefaultUI: true,
          zoomControl: true,
        });

        new g.maps.Marker({
          position: { lat: storeLat, lng: storeLng },
          map,
          label: "S",
          title: "Dark Store",
        });

        new g.maps.Marker({
          position: { lat: dropLat, lng: dropLng },
          map,
          label: "H",
          title: "Delivery Address",
        });

        if (riderLat != null && riderLng != null) {
          riderMarkerRef.current = new g.maps.Marker({
            position: { lat: riderLat, lng: riderLng },
            map,
            label: "R",
            title: "Rider",
          });
        }
      })
      .catch((e) => {
        if (mounted) setError(e.message);
      });
    return () => {
      mounted = false;
    };
  }, [storeLat, storeLng, dropLat, dropLng, riderLat, riderLng]);

  if (error) {
    return (
      <div className="h-52 rounded-xl border bg-gray-100 flex items-center justify-center text-xs text-gray-500 p-4">
        Live map unavailable ({error})
      </div>
    );
  }

  return <div ref={mapRef} className="w-full h-56 rounded-xl border bg-gray-100" />;
}

