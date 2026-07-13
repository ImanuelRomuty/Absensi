/** Distance in meters between two WGS84 points (Haversine). */
export function distanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function isInsideGeofence(params: {
  userLat: number;
  userLng: number;
  fenceLat: number;
  fenceLng: number;
  radiusMeters: number;
}): boolean {
  return (
    distanceMeters(
      params.userLat,
      params.userLng,
      params.fenceLat,
      params.fenceLng,
    ) <= params.radiusMeters
  );
}

/** Workday defaults Asia/Jakarta: late after 09:00, early before 17:00. */
export function attendanceFlags(type: "CLOCK_IN" | "CLOCK_OUT", recordedAt: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(recordedAt);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const minutes = hour * 60 + minute;
  if (type === "CLOCK_IN") {
    return { isLate: minutes > 9 * 60, isEarly: false };
  }
  return { isLate: false, isEarly: minutes < 17 * 60 };
}
