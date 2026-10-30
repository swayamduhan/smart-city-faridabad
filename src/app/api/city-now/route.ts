import { NextResponse } from "next/server";

export interface CityNow {
  temperature: number;
  feelsLike: number;
  humidity: number;
  wind: number;
  sky: string;
  aqi: number;
  aqiLabel: string;
  pm25: number;
  pm10: number;
  fetchedAt: string;
}

const LAT = 28.41;
const LNG = 77.31;

const SKY: Record<number, string> = {
  0: "Clear", 1: "Mostly clear", 2: "Partly cloudy", 3: "Cloudy", 45: "Fog", 48: "Fog",
  51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle", 61: "Light rain", 63: "Rain", 65: "Heavy rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow", 80: "Showers", 81: "Showers", 82: "Heavy showers", 95: "Thunderstorm", 96: "Thunderstorm", 99: "Thunderstorm",
};

function aqiLabel(aqi: number) {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy for some";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very unhealthy";
  return "Hazardous";
}

// Kept in memory so a busy demo doesn't hammer the free API; weather changes slowly anyway.
let cache: { at: number; data: CityNow } | null = null;

export async function GET() {
  if (cache && Date.now() - cache.at < 10 * 60 * 1000) return NextResponse.json(cache.data);
  try {
    const signal = AbortSignal.timeout(6000);
    const [wx, air] = await Promise.all([
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LNG}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code&timezone=Asia%2FKolkata`, { signal }).then((r) => r.json()),
      fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${LAT}&longitude=${LNG}&current=us_aqi,pm2_5,pm10&timezone=Asia%2FKolkata`, { signal }).then((r) => r.json()),
    ]);
    const data: CityNow = {
      temperature: Math.round(wx.current.temperature_2m),
      feelsLike: Math.round(wx.current.apparent_temperature),
      humidity: Math.round(wx.current.relative_humidity_2m),
      wind: Math.round(wx.current.wind_speed_10m),
      sky: SKY[wx.current.weather_code] ?? "Unknown",
      aqi: Math.round(air.current.us_aqi),
      aqiLabel: aqiLabel(air.current.us_aqi),
      pm25: Math.round(air.current.pm2_5),
      pm10: Math.round(air.current.pm10),
      fetchedAt: new Date().toISOString(),
    };
    cache = { at: Date.now(), data };
    return NextResponse.json(data);
  } catch {
    if (cache) return NextResponse.json(cache.data);
    return NextResponse.json({ error: "Weather service unavailable" }, { status: 503 });
  }
}
