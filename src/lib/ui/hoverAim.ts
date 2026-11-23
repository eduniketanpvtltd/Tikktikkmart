type Point = { x: number; y: number };

export function pointsTowardPanel(origin: Point, point: Point, rect: DOMRect) {
  const distances = [
    { distance: Math.abs(origin.x - rect.left), a: { x: rect.left, y: rect.top - 8 }, b: { x: rect.left, y: rect.bottom + 8 } },
    { distance: Math.abs(origin.x - rect.right), a: { x: rect.right, y: rect.top - 8 }, b: { x: rect.right, y: rect.bottom + 8 } },
    { distance: Math.abs(origin.y - rect.top), a: { x: rect.left - 8, y: rect.top }, b: { x: rect.right + 8, y: rect.top } },
    { distance: Math.abs(origin.y - rect.bottom), a: { x: rect.left - 8, y: rect.bottom }, b: { x: rect.right + 8, y: rect.bottom } },
  ];
  const { a, b } = distances.sort((left, right) => left.distance - right.distance)[0];
  const cross = (p: Point, q: Point) => (q.x - p.x) * (point.y - p.y) - (q.y - p.y) * (point.x - p.x);
  const sides = [cross(origin, a), cross(a, b), cross(b, origin)];
  return sides.every((value) => value >= 0) || sides.every((value) => value <= 0);
}
