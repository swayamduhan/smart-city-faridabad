"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { submitReport } from "@/lib/actions";
import { CATEGORY_LABEL } from "@/lib/format";
import { FBD_CENTER, locate, outsideCity } from "@/lib/map";
import type { IssueCategory } from "@/lib/types";
import { PinMap } from "./pin-map";

const CATEGORIES = Object.entries(CATEGORY_LABEL) as [IssueCategory, string][];
const MAX_SIDE = 1600;

/** Shrinks photos on the device so uploads stay fast on mobile data. */
async function toJpeg(source: CanvasImageSource, w: number, h: number): Promise<Blob> {
  const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  canvas.getContext("2d")!.drawImage(source, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't read that photo."))), "image/jpeg", 0.82));
}

export function ReportFlow() {
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [camera, setCamera] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [spot, setSpot] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [category, setCategory] = useState<IssueCategory | null>(null);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ id: string; ticket: string } | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => () => {
    if (photo) URL.revokeObjectURL(photo.url);
  }, [photo]);

  const useBlob = (blob: Blob) => setPhoto({ blob, url: URL.createObjectURL(blob) });

  const onFile = async (file?: File) => {
    if (!file) return;
    setPhotoError(null);
    try {
      const bitmap = await createImageBitmap(file);
      useBlob(await toJpeg(bitmap, bitmap.width, bitmap.height));
    } catch {
      setPhotoError("That file couldn't be read as a photo. Choose a JPG or PNG.");
    }
  };

  const findMe = async () => {
    setLocating(true);
    setLocError(null);
    try {
      const p = await locate();
      if (outsideCity(p)) {
        setLocError("You seem to be outside Faridabad. Tap the spot on the map instead.");
        setSpot({ lat: FBD_CENTER[1], lng: FBD_CENTER[0] });
      } else setSpot({ lat: p.lat, lng: p.lng });
    } catch (e) {
      setLocError((e as Error).message);
      setSpot((s) => s ?? { lat: FBD_CENTER[1], lng: FBD_CENTER[0] });
    } finally {
      setLocating(false);
    }
  };

  const submit = () => {
    setError(null);
    if (!category) return setError("Choose what kind of problem this is.");
    if (!spot) return setError("Mark where the problem is on the map.");
    const form = new FormData();
    form.set("category", category);
    form.set("description", description);
    form.set("lat", String(spot.lat));
    form.set("lng", String(spot.lng));
    if (photo) form.set("photo", new File([photo.blob], "report.jpg", { type: "image/jpeg" }));
    start(async () => {
      const res = await submitReport(form);
      if (res.ok) setDone(res.data);
      else setError(res.error);
    });
  };

  const reset = () => {
    setDone(null);
    setPhoto(null);
    setSpot(null);
    setCategory(null);
    setDescription("");
  };

  if (done) {
    return (
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="plate on-sign px-7 py-7" role="status">
        <p className="hi">शिकायत दर्ज हो गई</p>
        <h2 className="display text-[clamp(2rem,5vw,3.6rem)]">Report sent</h2>
        <p className="mt-1 text-lg">
          Your ticket number is <strong className="text-mark">{done.ticket}</strong>. Use it to follow the repair.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/report/${done.id}`} className="btn btn-mark">
            Track this report
          </Link>
          <button type="button" className="btn btn-line" onClick={reset}>
            Report another problem
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="grid gap-x-10 gap-y-8 lg:grid-cols-3">
      <section aria-labelledby="step-photo">
        <h2 id="step-photo" className="display text-2xl">
          1. Take a photo
        </h2>
        <div className="mt-3 aspect-[4/3] overflow-hidden bg-night">
          <AnimatePresence mode="wait">
            {camera ? (
              <CameraView
                key="camera"
                onClose={() => setCamera(false)}
                onCapture={(blob) => {
                  useBlob(blob);
                  setCamera(false);
                }}
                onFail={(m) => {
                  setPhotoError(m);
                  setCamera(false);
                }}
              />
            ) : photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <motion.img key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} src={photo.url} alt="Your photo of the problem" className="size-full object-cover" />
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid size-full place-items-center p-6 text-center text-white/75">
                A clear photo helps the crew find and fix it faster.
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {!camera && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn btn-mark" onClick={() => setCamera(true)}>
              {photo ? "Retake with camera" : "Open camera"}
            </button>
            <label className="btn btn-line cursor-pointer">
              Choose a photo
              <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
            </label>
          </div>
        )}
        {photoError && (
          <p role="alert" className="mt-2 font-semibold text-alert">
            {photoError}
          </p>
        )}
      </section>

      <section aria-labelledby="step-where">
        <h2 id="step-where" className="display text-2xl">
          2. Mark the spot
        </h2>
        <div className="mt-3">
          <PinMap className="aspect-[4/3]" zoom={spot ? 15 : 11} center={spot ?? undefined} pins={spot ? [{ id: "spot", lat: spot.lat, lng: spot.lng, color: "#ffc72c", label: "Problem location" }] : []} onPick={setSpot} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="button" className="btn btn-mark" onClick={findMe} disabled={locating}>
            {locating ? "Finding you" : "Use my location"}
          </button>
          <span className="text-[0.95rem] text-muted">{spot ? "Tap or drag to adjust the pin." : "Or tap the map."}</span>
        </div>
        {locError && (
          <p role="alert" className="mt-2 font-semibold text-alert">
            {locError}
          </p>
        )}
      </section>

      <section aria-labelledby="step-what">
        <h2 id="step-what" className="display text-2xl">
          3. Say what&apos;s wrong
        </h2>
        <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Type of problem">
          {CATEGORIES.map(([id, label]) => (
            <button key={id} type="button" className="filter" aria-pressed={category === id} onClick={() => {
                setCategory(id);
                setError(null);
              }}>
              {label}
            </button>
          ))}
        </div>
        <label className="label mt-4" htmlFor="desc">
          Description
        </label>
        <textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={600} placeholder="Large pothole outside the Sector 15 market gate" className="field" />
        {error && (
          <p role="alert" className="mt-2 font-semibold text-alert">
            {error}
          </p>
        )}
        <button type="button" onClick={submit} disabled={pending} className="btn btn-mark mt-3 w-full">
          {pending ? "Sending your report" : "Send report"}
        </button>
      </section>
    </div>
  );
}

function CameraView({ onCapture, onClose, onFail }: { onCapture: (b: Blob) => void; onClose: () => void; onFail: (m: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let stopped = false;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("unsupported");
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 } }, audio: false });
        if (stopped) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (video.current) video.current.srcObject = stream;
      } catch (e) {
        const denied = (e as Error).name === "NotAllowedError";
        onFail(denied ? "Camera access is blocked. Allow it in your browser's site settings, or choose a photo instead." : "No camera is available here. Choose a photo instead.");
      }
    })();
    return () => {
      stopped = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shoot = async () => {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    setFlash(true);
    onCapture(await toJpeg(v, v.videoWidth, v.videoHeight));
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative size-full">
      <video ref={video} autoPlay playsInline muted className="size-full object-cover" aria-label="Camera preview" />
      {flash && <div className="absolute inset-0 bg-white" aria-hidden="true" />}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-3 p-3">
        <button type="button" className="btn btn-mark" onClick={shoot}>
          Take photo
        </button>
        <button type="button" className="btn bg-night/70 text-white" onClick={onClose}>
          Cancel
        </button>
      </div>
    </motion.div>
  );
}
