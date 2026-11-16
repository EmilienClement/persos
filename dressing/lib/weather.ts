// Open-Meteo : gratuit, sans clé, usage non commercial. Source à citer (CC BY 4.0).
export type Weather = {
  now: { temp: number; feels: number; wind: number; label: string };
  day: { feelsMin: number; feelsMax: number; rainMax: number };
};

const WMO: Record<number, string> = {
  0: "ciel dégagé", 1: "plutôt dégagé", 2: "partiellement nuageux", 3: "couvert",
  45: "brouillard", 48: "brouillard givrant", 51: "bruine légère", 53: "bruine", 55: "bruine forte",
  61: "pluie légère", 63: "pluie", 65: "pluie forte", 71: "neige légère", 73: "neige", 75: "neige forte",
  80: "averses", 81: "averses fortes", 82: "averses violentes", 95: "orage", 96: "orage et grêle", 99: "orage et grêle",
};

export async function getWeather(lat: number, lon: number): Promise<Weather> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m` +
    `&hourly=apparent_temperature,precipitation_probability&forecast_days=1&timezone=auto`;
  const res = await fetch(url, { next: { revalidate: 1800 } });
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  const d = await res.json();

  const hours: number[] = d.hourly.time.map((t: string) => Number(t.slice(11, 13)));
  const idx = hours.map((h, i) => (h >= 8 && h <= 22 ? i : -1)).filter((i) => i >= 0);
  const use = idx.length ? idx : hours.map((_, i) => i);
  const feels: number[] = use.map((i) => d.hourly.apparent_temperature[i]);
  const rain: number[] = use.map((i) => d.hourly.precipitation_probability[i] ?? 0);

  return {
    now: {
      temp: Math.round(d.current.temperature_2m),
      feels: Math.round(d.current.apparent_temperature),
      wind: Math.round(d.current.wind_speed_10m),
      label: WMO[d.current.weather_code] ?? "variable",
    },
    day: {
      feelsMin: Math.round(Math.min(...feels)),
      feelsMax: Math.round(Math.max(...feels)),
      rainMax: Math.round(Math.max(...rain)),
    },
  };
}
