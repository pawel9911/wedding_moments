// src/app/capture/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { db } from "@/db/dexieDB";
import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";

const VALID_PINS = [
  "0001",
  "0002",
  "0003",
  "0004",
  "0005",
  "0006",
  "0007",
  "0008",
  "0009",
  "0010",
  "0011",
  "0012",
  "0013",
  "0207",
];

export default function CapturePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlPin = searchParams.get("pin");

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const queueCount = useLiveQuery(() => db.photos.count()) || 0;

  useEffect(() => {
    if (urlPin && VALID_PINS.includes(urlPin)) {
      setIsAuthorized(true);
    } else {
      router.push("/?error=invalid_pin");
    }
  }, [urlPin, router]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    for (let i = 0; i < e.target.files.length; i++) {
      const file = e.target.files[i];
      const previewUrl = URL.createObjectURL(file);

      await db.photos.add({
        blob: file,
        previewUrl,
        createdAt: Date.now(),
      });
    }

    if (navigator.onLine) {
      syncPhotos();
    }
  };

  const syncPhotos = async () => {
    const localPhotos = await db.photos.toArray();
    if (localPhotos.length === 0 || isUploading) return;

    setIsUploading(true);

    for (const photo of localPhotos) {
      const formData = new FormData();
      formData.append("file", photo.blob);

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          await db.photos.delete(photo.id!);
          URL.revokeObjectURL(photo.previewUrl);
        }
      } catch (err) {
        console.error("Upload failed, item kept in offline cache", err);
      }
    }
    setIsUploading(false);
  };

  useEffect(() => {
    window.addEventListener("online", syncPhotos);
    return () => window.removeEventListener("online", syncPhotos);
  }, []);

  if (!isAuthorized)
    return (
      <div className="p-8 text-center text-zinc-500">Verifying access...</div>
    );

  return (
    <main className="min-h-screen bg-[#0d070b] text-zinc-100 p-6 flex flex-col justify-between relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#e05397]/5 rounded-full blur-[60px] pointer-events-none" />

      <header className="flex justify-end items-center py-4 z-10">
        <Link
          href={`/gallery?pin=${urlPin}`}
          className="bg-[#1a0f17] border border-[#291422] hover:border-[#3d1f33] px-4 py-2 rounded-xl text-xs font-medium transition flex items-center gap-2"
        >
          🌸 Zobacz galerię ({queueCount})
        </Link>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center my-8 z-10 w-full max-w-sm mx-auto space-y-4">
        <label className="w-full bg-[#160b13]/60 border border-[#2d1626] hover:border-[#e05397]/40 rounded-2xl p-5 flex items-center gap-4 cursor-pointer transition shadow-xl group">
          <div className="p-3 bg-[#24111f] rounded-xl text-2xl group-hover:scale-110 transition-transform">
            📸
          </div>
          <div className="flex-1 text-left">
            <h3 className="text-sm font-semibold text-zinc-200">
              Zrób zdjęcie
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Uruchom aparat i prześlij od razu
            </p>
          </div>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>

        <label className="w-full bg-[#160b13]/60 border border-[#2d1626] hover:border-[#e05397]/40 rounded-2xl p-5 flex items-center gap-4 cursor-pointer transition shadow-xl group">
          <div className="p-3 bg-[#24111f] rounded-xl text-2xl group-hover:scale-110 transition-transform">
            📁
          </div>
          <div className="flex-1 text-left">
            <h3 className="text-sm font-semibold text-zinc-200">
              Wybierz z galerii
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Dodaj jedno lub wiele gotowych zdjęć
            </p>
          </div>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
        </label>

        <p className="text-xs text-zinc-500 text-center pt-4 max-w-65">
          Zdjęcia zostaną przesłane automatycznie. Jeśli stracisz połączenie,
          zapiszemy je bezpiecznie w lokalnej kolejce.
        </p>
      </div>

      <footer className="pb-6 z-10 mx-auto">
        <button
          onClick={syncPhotos}
          disabled={isUploading || queueCount === 0}
          className="w-full bg-[#e05397] hover:bg-[#c23b7b] disabled:bg-[#1a0f17] disabled:text-zinc-600 text-white font-semibold p-4 rounded-2xl text-sm transition shadow-lg flex items-center justify-center gap-2"
        >
          {isUploading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Synchronizacja z Google Drive...
            </>
          ) : (
            `Wymuś synchronizację (${queueCount})`
          )}
        </button>
      </footer>
    </main>
  );
}
