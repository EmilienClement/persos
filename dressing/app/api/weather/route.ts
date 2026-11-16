import { getWeather } from "@/lib/weather";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { data } = await (await createClient()).auth.getUser();
  if (!data.user) return Response.json({ error: "non_connecte" }, { status: 401 });

  const u = new URL(request.url);
  const lat = Number(u.searchParams.get("lat"));
  const lon = Number(u.searchParams.get("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return Response.json({ error: "coordonnées invalides" }, { status: 400 });
  try {
    return Response.json(await getWeather(lat, lon));
  } catch {
    return Response.json({ error: "météo indisponible" }, { status: 502 });
  }
}
