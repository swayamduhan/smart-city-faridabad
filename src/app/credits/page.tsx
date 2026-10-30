import type { Metadata } from "next";
import { PageSign } from "@/components/page-sign";
import credits from "@/data/photo-credits.json";

export const metadata: Metadata = { title: "Credits" };

const DATA = [
  ["OpenStreetMap contributors", "Places, metro stations and the Violet Line, under the ODbL", "https://www.openstreetmap.org/copyright"],
  ["OpenFreeMap", "Map tiles", "https://openfreemap.org"],
  ["Photon by Komoot", "Address search", "https://photon.komoot.io"],
  ["OSRM", "Road directions and bus route shapes", "https://project-osrm.org"],
  ["Open-Meteo", "Weather and modelled air quality", "https://open-meteo.com"],
  ["Census of India and Wikipedia", "City facts", "https://en.wikipedia.org/wiki/Faridabad"],
];

export default function CreditsPage() {
  return (
    <>
      <PageSign title="Credits" hi="आभार">
        Photos and data that make this demo possible.
      </PageSign>
      <div className="mx-auto grid max-w-[1200px] gap-12 px-4 pt-8 lg:grid-cols-2 lg:px-8">
        <section aria-labelledby="photos">
          <h2 id="photos" className="display text-3xl">
            Photos
          </h2>
          <p className="mt-1 text-muted">From Wikimedia Commons. Resized, and in the home page tour, shown through a visual effect.</p>
          <ul className="mt-3 border-t-2 border-ink">
            {Object.values(credits).map((c) => (
              <li key={c.page} className="border-b border-line py-2.5">
                <a href={c.page} target="_blank" rel="noreferrer" className="link font-semibold">
                  {c.title.replace(/\.(jpg|jpeg|png)$/i, "").replace(/"/g, "")}
                </a>
                <p className="text-[0.95rem] text-muted">
                  By {c.artist},{" "}
                  <a href={c.licenseUrl} target="_blank" rel="noreferrer" className="link">
                    {c.license}
                  </a>
                </p>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="data">
          <h2 id="data" className="display text-3xl">
            Data and services
          </h2>
          <ul className="mt-3 border-t-2 border-ink">
            {DATA.map(([name, what, href]) => (
              <li key={name} className="border-b border-line py-2.5">
                <a href={href} target="_blank" rel="noreferrer" className="link font-semibold">
                  {name}
                </a>
                <p className="text-[0.95rem] text-muted">{what}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[0.95rem] text-muted">Bills, payments, candidates, jobs, projects, notices, sample reports and vehicle positions are invented for this demo.</p>
        </section>
      </div>
    </>
  );
}
