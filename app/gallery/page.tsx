"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { db } from "@/db/dexieDB";
import { useLiveQuery } from "dexie-react-hooks";
import Gallery from "@/components/Gallery";
import Link from "next/link";
import { VALID_PINS } from "@/constant";

// Typ reprezentujący zunifikowane zdjęcie w galerii
interface GalleryPhoto {
  id: string;
  url: string;
  name?: string;
  createdAt: number;
  isLocal: boolean;
}

export default function GalleryPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#0d070b] text-zinc-100 flex flex-col items-center justify-center p-6">
          <div className="w-8 h-8 border-2 border-[#e05397] border-t-transparent rounded-full animate-spin" />
        </main>
      }
    >
      <GalleryContent />
    </Suspense>
  );
}

function GalleryContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlPin = searchParams.get("pin");

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [drivePhotos, setDrivePhotos] = useState<GalleryPhoto[]>([]);
  const [isLoadingDrive, setIsLoadingDrive] = useState(true);

  // Pobieramy zdjęcia z lokalnej bazy Dexie (oczekujące na synchronizację)
  const localPhotosRaw = useLiveQuery(() => db.photos.toArray()) || [];

  // Konwersja lokalnych obiektów Dexie (zawierających Bloby) na adresy URL zdatne do wyświetlenia w <img />
  const [localPhotos, setLocalPhotos] = useState<GalleryPhoto[]>([]);

  useEffect(() => {
    // Generujemy ObjectURL dla lokalnych plików Blob, aby przeglądarka mogła je wyrenderować
    const mapped = localPhotosRaw.map((photo) => ({
      id: photo.id?.toString() || Math.random().toString(),
      url: URL.createObjectURL(photo.blob),
      createdAt: photo.createdAt || Date.now(),
      isLocal: true,
    }));

    setLocalPhotos(mapped);

    // Czyszczenie pamięci po usunięciu/zmianie lokalnych zasobów
    return () => {
      mapped.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [localPhotosRaw]);

  // 1. Walidacja autoryzacji z PIN-u
  useEffect(() => {
    if (urlPin && VALID_PINS.includes(urlPin)) {
      setIsAuthorized(true);
    } else {
      router.replace("/?error=invalid_pin");
    }
  }, [urlPin, router]);

  // 2. Pobieranie zdjęć z Google Drive przez API Route
  useEffect(() => {
    if (!isAuthorized || !urlPin) return;

    const fetchDrivePhotos = async () => {
      try {
        setIsLoadingDrive(true);
        const res = await fetch(
          `/api/photos?pin=${encodeURIComponent(urlPin)}`,
        );
        if (res.ok) {
          const data = await res.json();
          setDrivePhotos(data.photos || []);
        }
      } catch (err) {
        console.error("Nie udało się załadować zdjęć z Google Drive:", err);
      } finally {
        setIsLoadingDrive(false);
      }
    };

    fetchDrivePhotos();
  }, [isAuthorized, urlPin]);

  // Łączymy kolejkę lokalną offline ze zdjęciami pobranymi z chmury Google
  const allPhotos = [...localPhotos, ...drivePhotos].sort(
    (a, b) => b.createdAt - a.createdAt,
  );

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#0d070b] flex items-center justify-center text-zinc-400 text-sm">
        <div className="w-5 h-5 border-2 border-[#e05397] border-t-transparent rounded-full animate-spin mr-3" />
        Weryfikacja uprawnień...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0d070b] text-zinc-100 p-6 flex flex-col justify-between relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#e05397]/5 rounded-full blur-[60px] pointer-events-none" />

      <header className="flex justify-between items-center py-4 z-10 w-full max-w-5xl mx-auto">
        <h1 className="text-sm font-semibold text-zinc-400 tracking-wide uppercase">
          Album Weselny{" "}
          {isLoadingDrive && (
            <span className="text-xs text-[#e05397] animate-pulse ml-2">
              (Odświeżanie...)
            </span>
          )}
        </h1>
        <Link
          href={`/capture?pin=${urlPin}`}
          className="bg-[#160b13]/85 border border-[#2d1626] shadow-2xl backdrop-blur-md text-zinc-200 hover:border-[#e05397]/40 font-sans text-xs px-4 py-2 rounded-xl transition"
        >
          Dodaj zdjęcie
        </Link>
      </header>

      {/* Ekran pustej galerii (gdy brak zdjęć na dysku i w pamięci offline) */}
      {!isLoadingDrive && allPhotos.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 z-10 w-full max-w-lg mx-auto">
          <div className="text-center py-12 px-5 border border-[#2d1626] rounded-2xl bg-[#160b13]/60 shadow-xl w-full">
            <span className="text-4xl block mb-4 animate-pulse">📸</span>
            <p className="font-sans text-pink-300 mb-3">
              Stwórzmy razem coś, co zostanie z nami na lata.
            </p>
            <p className="text-xs text-zinc-300 mb-6 font-sans">
              Galeria zdjęć jest w tym momencie pusta.
            </p>
            <Link
              href={`/capture?pin=${urlPin}`}
              className="inline-block bg-[#24111f] border border-[#2d1626] hover:border-[#e05397]/40 hover:text-pink-300 px-5 py-3 rounded-xl text-xs font-semibold text-zinc-200 transition shadow-md"
            >
              Dodaj pierwsze zdjęcie
            </Link>
          </div>
        </div>
      )}

      {/* Wyświetlanie siatki zdjęć */}
      {allPhotos.length > 0 && (
        <div className="w-full z-10 flex-1 max-w-5xl mx-auto mt-4">
          <Gallery
            photos={allPhotos}
            onDelete={async (id) => {
              // Funkcja usuwania sprawdzi czy zdjęcie jest lokalne, jeśli tak - usuwa z Dexie
              const isLocalPhoto = localPhotos.some((p) => p.id === id);
              if (isLocalPhoto) {
                await db.photos.delete(Number(id));
              } else {
                alert(
                  "Zdjęcia wysłane na Google Drive mogą być modyfikowane wyłącznie przez administratora.",
                );
              }
            }}
          />
        </div>
      )}
    </main>
  );
}
