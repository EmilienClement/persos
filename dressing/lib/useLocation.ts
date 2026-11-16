"use client";
import { useCallback, useEffect, useState } from "react";

export type Place = { city: string; lat: number; lon: number };
const KEY = "dressing.place";
const DEFAULT: Place = {
  city: process.env.NEXT_PUBLIC_DEFAULT_CITY ?? "Nantes",
  lat: Number(process.env.NEXT_PUBLIC_DEFAULT_LAT ?? 47.2184),
  lon: Number(process.env.NEXT_PUBLIC_DEFAULT_LON ?? -1.5536),
};

export function useLocation() {
  const [place, setPlace] = useState<Place>(DEFAULT);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setPlace(JSON.parse(raw));
    } catch {}
  }, []);

  const save = useCallback((p: Place) => {
    setPlace(p);
    localStorage.setItem(KEY, JSON.stringify(p));
  }, []);

  const byGeolocation = useCallback(
    () =>
      new Promise<boolean>((resolve) => {
        if (!navigator.geolocation) return resolve(false);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            save({ city: "Ma position", lat: pos.coords.latitude, lon: pos.coords.longitude });
            resolve(true);
          },
          () => resolve(false),
          { timeout: 8000, maximumAge: 600_000 },
        );
      }),
    [save],
  );

  const byCity = useCallback(
    async (name: string) => {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=fr`,
      );
      const hit = (await res.json())?.results?.[0];
      if (!hit) return false;
      save({ city: hit.name, lat: hit.latitude, lon: hit.longitude });
      return true;
    },
    [save],
  );

  return { place, byGeolocation, byCity };
}
