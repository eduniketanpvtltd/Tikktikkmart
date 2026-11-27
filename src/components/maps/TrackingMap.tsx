"use client";

import { useEffect, useRef, useState } from "react";
import { Bike, MapPin, Store } from "lucide-react";
import { loadGoogleMaps } from "@/lib/maps/google";
import type { Coordinates } from "@/lib/maps/coordinates";

const WARM_MAP_STYLES = [
  { elementType: "geometry", stylers: [{ color: "#F7F1E6" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#6D584B" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#FBF6EE" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#FFFFFF" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#EADBC6" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#FFF8EE" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#FBE3CF" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#E8C5A5" }] },
  { featureType: "landscape.man_made", elementType: "geometry", stylers: [{ color: "#F2E9DA" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#EFE6D5" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#DCEAF5" }] },
];

function svgPin(bg: string, letter: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="13" fill="${bg}" stroke="#FFFFFF" stroke-width="3"/><text x="16" y="20" text-anchor="middle" fill="#FFFFFF" font-family="system-ui,sans-serif" font-size="12" font-weight="700">${letter}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function TrackingMap({ store, drop, rider, active }: {
  store: Coordinates | null;
  drop: Coordinates | null;
  rider: Coordinates | null;
  active: boolean;
}) {
  const element = useRef<HTMLDivElement>(null);
  const marker = useRef<google.maps.Marker | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const storeLat = store?.lat, storeLng = store?.lng;
  const dropLat = drop?.lat, dropLng = drop?.lng;
  const riderLat = rider?.lat, riderLng = rider?.lng;

  useEffect(() => {
    if (storeLat == null || storeLng == null || dropLat == null || dropLng == null) return;
    let cancelled = false;
    let pins: google.maps.Marker[] = [];
    let routeLine: { setMap: (m: null) => void } | null = null;
    const storePoint = { lat: storeLat, lng: storeLng };
    const dropPoint = { lat: dropLat, lng: dropLng };
    void loadGoogleMaps().then(({ maps }) => {
      if (cancelled || !element.current) return;
      const instance = new maps.Map(element.current, {
        center: dropPoint,
        zoom: 15,
        disableDefaultUI: true,
        zoomControl: false,
        gestureHandling: "cooperative",
        styles: WARM_MAP_STYLES,
      } as never);
      if (storeLat !== dropLat || storeLng !== dropLng) {
        instance.fitBounds({
          north: Math.max(storeLat, dropLat), south: Math.min(storeLat, dropLat),
          east: Math.max(storeLng, dropLng), west: Math.min(storeLng, dropLng),
        }, 42);
        const PolylineCtor = (maps as unknown as { Polyline?: new (opts: Record<string, unknown>) => { setMap: (m: null) => void } }).Polyline;
        if (PolylineCtor) {
          routeLine = new PolylineCtor({
            path: [storePoint, dropPoint],
            geodesic: true,
            strokeOpacity: 0,
            icons: [{
              icon: { path: "M 0,-1 0,1", strokeOpacity: 0.75, strokeColor: "#A8421A", scale: 3 },
              offset: "0",
              repeat: "12px",
            }],
            map: instance,
          });
        }
      }
      pins = [
        new maps.Marker({
          position: storePoint,
          map: instance,
          title: "Store",
          icon: svgPin("#3A2418", "S"),
        } as never),
        new maps.Marker({
          position: dropPoint,
          map: instance,
          title: "Delivery address",
          icon: svgPin("#A8421A", "D"),
        } as never),
      ];
      setMap(instance);
    }).catch(() => { if (!cancelled) setMap(null); });

    return () => {
      cancelled = true;
      for (const pin of pins) pin.setMap(null);
      routeLine?.setMap(null);
      marker.current?.setMap(null);
      marker.current = null;
      setMap(null);
    };
  }, [storeLat, storeLng, dropLat, dropLng]);

  useEffect(() => {
    if (!map) return;
    if (riderLat == null || riderLng == null) {
      marker.current?.setMap(null);
      marker.current = null;
      return;
    }
    const position = { lat: riderLat, lng: riderLng };
    if (marker.current) {
      marker.current.setPosition(position);
    } else {
      marker.current = new google.maps.Marker({
        position,
        map,
        title: "Delivery partner",
        icon: svgPin("#2E7D4F", "R"),
      } as never);
    }
    const bounds = map.getBounds();
    if (bounds && !bounds.contains(position)) map.panTo(position);
  }, [map, riderLat, riderLng]);

  return (
    <figure className="tracking-map">
      <div ref={element} className="tracking-map-live" aria-hidden={!map} aria-label="Delivery tracking map" />
      {!map && (
        <div className="tracking-map-preview">
          <div className="tracking-map-points" aria-hidden="true">
            <span><Store size={18} /> Store</span><i /><span><MapPin size={18} /> You</span>
          </div>
          <figcaption>
            {rider ? <a href={`https://www.google.com/maps/search/?api=1&query=${rider.lat},${rider.lng}`} target="_blank" rel="noreferrer"><Bike size={16} /> View rider location on Maps</a>
              : active ? "Waiting for a recent rider location" : "Live location appears after pickup"}
          </figcaption>
        </div>
      )}
      {map && active && <figcaption className="tracking-map-caption" aria-live="polite">{rider ? "Live rider location" : "Waiting for rider location"}</figcaption>}
    </figure>
  );
}
