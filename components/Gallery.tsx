"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";

interface UnifiedPhoto {
  id: string;
  url: string;
  name?: string;
  createdAt: number;
  isLocal: boolean;
}

interface GalleryProps {
  photos: UnifiedPhoto[];
  onDelete: (id: string) => void;
}

// Funkcja optymalizująca linki z Google User Content
const getOptimizedUrl = (url: string, size: number = 800) => {
  if (url.includes("googleusercontent.com")) {
    // Usuwamy istniejące parametry wielkości (np. =wX lub =sX) i dodajemy optymalny rozmiar i format
    const cleanUrl = url.split("=")[0];
    return `${cleanUrl}=w${size}-rw`; // "-rw" wymusza nowoczesny, lekki format WebP
  }
  return url;
};

const Gallery = ({ photos, onDelete }: GalleryProps) => {
  const searchParams = useSearchParams();
  const urlPin = searchParams.get("pin");
  const [selectedPhoto, setSelectedPhoto] = useState<UnifiedPhoto | null>(null);
  const [activeFilter, setActiveFilter] = useState("all");

  const filters = [
    { id: "all", label: "Wszystkie" },
    { id: urlPin || "0207", label: "Twój Stolik" },
    { id: "0207", label: "Młoda Para" },
  ];

  const filteredPhotos = photos.filter((photo) => {
    if (activeFilter === "all") return true;

    const match = photo.name?.match(/\[(\d+)\]/);

    if (!match) return false;

    const photoPin = match[1];

    return photoPin === activeFilter;
  });

  return (
    <div className="w-full px-0 pt-2 pb-24 bg-[#0d070b] relative min-h-screen flex flex-col justify-between">
      {/* Układ siatki Masonry */}
      <motion.div
        layout
        className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-2 w-full space-y-2 px-1"
      >
        <AnimatePresence mode="popLayout">
          {filteredPhotos.map((photo) => {
            // Generujemy mniejszą wersję dla siatki (np. szerokość 500px)
            const gridSrc = getOptimizedUrl(photo.url, 500);

            return (
              <motion.div
                key={photo.id}
                layoutId={`photo-container-${photo.id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{
                  scale: 0.99,
                  filter: "brightness(1.05)",
                }}
                transition={{ type: "spring", stiffness: 260, damping: 25 }}
                className="break-inside-avoid relative overflow-hidden bg-[#160b13] cursor-pointer rounded-xl border border-white/5 shadow-lg group inline-block w-full aspect-auto"
                onClick={() => setSelectedPhoto(photo)}
              >
                {/* Użycie unmanaged Next.js Image do zachowania elastycznego układu columns CSS */}
                <Image
                  src={gridSrc}
                  alt="Zdjęcie weselne"
                  width={400} // Wartości szacunkowe dla poprawnego podziału aspect-ratio
                  height={600}
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                  className="w-full h-auto object-cover rounded-xl transition-transform duration-700 group-hover:scale-[1.01]"
                  priority={false}
                />

                {/* Status i overlay */}
                <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end text-left font-mono">
                  <span className="text-[10px] tracking-wider uppercase font-sans font-medium">
                    {photo.isLocal ? (
                      <span className="text-amber-400 animate-pulse">
                        ⏳ Oczekuje w kolejce
                      </span>
                    ) : (
                      <span className="text-emerald-400">
                        ✨ Zapisano w albumie
                      </span>
                    )}
                  </span>
                </div>

                {photo.isLocal && (
                  <div className="absolute top-2 right-2 bg-amber-500/80 backdrop-blur-md text-white text-[9px] px-2 py-0.5 rounded-full font-mono animate-pulse">
                    OFFLINE
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {/* MODAL PEŁNOEKRANOWY */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#0d070b]/95 z-50 flex items-center justify-center p-4 backdrop-blur-md"
            onClick={() => setSelectedPhoto(null)}
          >
            <motion.div
              layoutId={`photo-container-${selectedPhoto.id}`}
              className="w-full max-w-4xl max-h-[85vh] relative flex flex-col items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative w-full h-[75vh]">
                <Image
                  src={getOptimizedUrl(selectedPhoto.url, 1200)} // Większa wersja do modalu (max 1200px)
                  alt="Pełny widok zdjęcia"
                  fill
                  sizes="(max-width: 1200px) 100vw"
                  className="object-contain rounded-2xl shadow-2xl border border-white/5"
                  priority
                />
              </div>

              {/* Panel informacyjny modalu */}
              <div className="w-full max-w-2xl mt-4 flex justify-between items-end px-2 font-mono">
                <div className="text-left">
                  <p className="text-xs uppercase tracking-widest text-pink-400 font-semibold font-sans">
                    {selectedPhoto.isLocal
                      ? "Kolejka synchronizacji"
                      : "Album weselny"}
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">
                    Godzina:{" "}
                    {new Date(selectedPhoto.createdAt).toLocaleTimeString()}
                  </p>
                </div>

                {selectedPhoto.isLocal && (
                  <button
                    onClick={async () => {
                      onDelete(selectedPhoto.id);
                      setSelectedPhoto(null);
                    }}
                    className="bg-rose-950/40 border border-rose-500/30 text-rose-400 px-3 py-1.5 rounded-xl hover:bg-rose-500 hover:text-white transition-all text-xs font-sans font-medium"
                  >
                    Usuń zdjęcie
                  </button>
                )}
              </div>

              <button
                onClick={() => setSelectedPhoto(null)}
                className="absolute top-4 right-4 bg-white/5 border border-white/10 text-white w-10 h-10 hover:bg-[#e05397] hover:border-[#e05397] transition-all duration-300 rounded-full flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DIALOG FILTROWANIA */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 px-2 w-full max-w-xs sm:max-w-sm">
        <div className="bg-[#160b13]/85 border border-[#2d1626] shadow-2xl backdrop-blur-md p-1.5 rounded-2xl flex justify-between items-center w-full font-mono text-xs tracking-wider">
          {filters.map((filter) => {
            const isSelected = activeFilter === filter.id;
            return (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={`relative px-3 py-2 flex-1 text-center transition-all duration-300 rounded-xl whitespace-nowrap text-[11px] font-sans ${
                  isSelected
                    ? "text-zinc-200 font-semibold bg-[#24111f] border border-[#e05397]/30"
                    : "text-zinc-400 hover:text-zinc-200 border border-transparent"
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Gallery;
