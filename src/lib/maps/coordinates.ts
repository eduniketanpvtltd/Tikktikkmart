import { Buffer } from "node:buffer";

export type Coordinates = { lat: number; lng: number };

export function readCoordinates(location: unknown): Coordinates | null {
  let lat: unknown;
  let lng: unknown;

  if (typeof location === "object" && location && "coordinates" in location && Array.isArray(location.coordinates)) {
    [lng, lat] = location.coordinates;
  } else if (typeof location === "string") {
    const hex = location.startsWith("\\x") ? location.slice(2) : location;
    if (!/^(?:[a-f0-9]{42}|[a-f0-9]{50})$/i.test(hex)) return null;
    const bytes = Buffer.from(hex, "hex");
    const order = bytes[0];
    if (order !== 0 && order !== 1) return null;
    const little = order === 1;
    const type = little ? bytes.readUInt32LE(1) : bytes.readUInt32BE(1);
    if (type !== 1 && type !== 0x20000001) return null;
    const offset = type === 1 ? 5 : 9;
    if (bytes.length !== offset + 16) return null;
    lng = little ? bytes.readDoubleLE(offset) : bytes.readDoubleBE(offset);
    lat = little ? bytes.readDoubleLE(offset + 8) : bytes.readDoubleBE(offset + 8);
  }

  return typeof lat === "number" && typeof lng === "number" && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
    ? { lat, lng }
    : null;
}
