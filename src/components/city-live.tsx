"use client";

import { timeAgo } from "@/lib/format";
import { useCityNow } from "./use-city-now";

const ADVICE = (aqi: number) => {
  if (aqi <= 50) return "Air is clean. A good day to be outdoors.";
  if (aqi <= 100) return "Air is acceptable. Very sensitive people should take it easy outdoors.";
  if (aqi <= 150) return "Children, older people and anyone with asthma should limit long outdoor activity.";
  if (aqi <= 200) return "Everyone should limit long outdoor activity. Consider wearing a mask.";
  if (aqi <= 300) return "Avoid outdoor exercise. Keep windows closed and wear a mask outside.";
  return "Stay indoors if you can. Wear a well-fitted N95 mask outside.";
};

export function CityLive() {
  const { now, failed } = useCityNow();
  if (failed && !now) {
    return <p className="board led mt-4 px-5 py-4 text-2xl">Weather feed is offline. Check your connection and reload.</p>;
  }
  return (
    <div className="board mt-4 grid gap-6 px-5 pb-4 pt-5 md:grid-cols-2 lg:px-8 lg:py-7" aria-busy={!now}>
      <div>
        <p className="led text-[clamp(3.4rem,8vw,6.5rem)] leading-none">{now ? `${now.temperature}°C` : "--°C"}</p>
        <p className="led mt-2 text-2xl">{now?.sky ?? "Reading weather"}</p>
        {now && (
          <p className="mt-2 text-white/75">
            Feels like {now.feelsLike}°C. Humidity {now.humidity}%. Wind {now.wind} km/h.
          </p>
        )}
      </div>
      <div>
        <p className="led text-[clamp(3.4rem,8vw,6.5rem)] leading-none">{now ? `AQI ${now.aqi}` : "AQI --"}</p>
        <p className="led mt-2 text-2xl">{now?.aqiLabel ?? "Reading air quality"}</p>
        {now && (
          <p className="mt-2 max-w-[48ch] text-white/75">
            {ADVICE(now.aqi)} PM2.5 is {now.pm25} and PM10 is {now.pm10} µg/m³. Modelled by Open-Meteo, updated {timeAgo(now.fetchedAt)}.
          </p>
        )}
      </div>
    </div>
  );
}
