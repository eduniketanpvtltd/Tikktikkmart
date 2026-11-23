"use client";

import { useEffect, useRef, useState } from "react";
import { Bike, MapPin, Store } from "lucide-react";
import { loadGoogleMaps } from "@/lib/maps/google";
import type { Coordinates } from "@/lib/maps/coordinates";

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
    const storePoint = { lat: storeLat, lng: storeLng };
    const dropPoint = { lat: dropLat, lng: dropLng };
    void loadGoogleMaps().then(({ maps }) => {
      if (cancelled || !element.current) return;
      const instance = new maps.Map(element.current, {
        center: dropPoint,
        zoom: 15,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: "cooperative",
      });
      if (storeLat !== dropLat || storeLng !== dropLng) {
        instance.fitBounds({
          north: Math.max(storeLat, dropLat), south: Math.min(storeLat, dropLat),
          east: Math.max(storeLng, dropLng), west: Math.min(storeLng, dropLng),
        }, 36);
      }
      pins = [
        new maps.Marker({ position: storePoint, map: instance, label: "S", title: "Store" }),
        new maps.Marker({ position: dropPoint, map: instance, label: "D", title: "Delivery address" }),
      ];
      setMap(instance);
    }).catch(() => { if (!cancelled) setMap(null); });

    return () => {
      cancelled = true;
      for (const pin of pins) pin.setMap(null);
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
      marker.current = new google.maps.Marker({ position, map, label: "R", title: "Delivery partner" });
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
