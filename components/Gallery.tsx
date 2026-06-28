"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { OfflinePhoto } from "@/db/dexieDB";
import Image from "next/image";

const Gallery = ({
  photos,
  onDelete,
}: {
  photos: OfflinePhoto[];
  onDelete: (id: number) => void;
}) => {
  const [selectedPhoto, setSelectedPhoto] = useState<OfflinePhoto | null>(null);

  const [activeFilter, setActiveFilter] = useState("all");

  const filters = [
    { id: "all", label: "Wszystkie" },
    { id: "table", label: "Twój Stolik" },
    { id: "bride", label: "Młoda Para" },
  ];

  return (
    <div className="w-full px-0 pt-2 pb-24 bg-[#0d070b] relative min-h-screen flex flex-col justify-between">
      <motion.div
        layout
        className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-1 w-full space-y-1 px-1"
      >
        <AnimatePresence mode="popLayout">
          {photos.map((photo) => (
            <motion.div
              key={photo.id}
              layoutId={`photo-container-${photo.id}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              whileHover={{
                scale: 0.98,
                filter: "brightness(1.05)",
              }}
              transition={{ type: "spring", stiffness: 260, damping: 25 }}
              className="break-inside-avoid relative overflow-hidden bg-[#160b13] cursor-pointer rounded-none border border-black/20 group inline-block w-full mb-1"
              onClick={() => setSelectedPhoto(photo)}
            >
              {/* Dynamiczne zdjęcie - automatyczna wysokość (wyszukuje proporcje) */}
              <img
                src={photo.previewUrl}
                alt="Zdjęcie z wydarzenia"
                className="w-full h-auto object-cover rounded-none transition-transform duration-700 group-hover:scale-102"
              />

              {/* Subtelny overlay informacyjny po najechaniu */}
              <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end text-left font-mono">
                <span className="text-[10px] text-pink-300 tracking-wider uppercase">
                  Oczekuje w kolejce
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* DYNAMICZNY PODGLĄD PEŁNOEKRANOWY (MODAL) */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#0d070b]/95 z-50 flex items-center justify-center p-0 backdrop-blur-md"
            onClick={() => setSelectedPhoto(null)}
          >
            <motion.div
              layoutId={`photo-container-${selectedPhoto.id}`}
              className="w-full max-w-5xl h-full max-h-[90vh] relative flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative w-full h-full flex items-center justify-center">
                <Image
                  src={selectedPhoto.previewUrl}
                  alt="Pełny widok zdjęcia"
                  className="max-w-full max-h-[85vh] object-contain rounded-none shadow-2xl border border-white/5"
                  fill
                  unoptimized
                />
              </div>

              <button
                onClick={() => setSelectedPhoto(null)}
                className="absolute top-6 right-6 bg-black/40 border border-white/10 text-white p-3 hover:bg-[#e05397] hover:border-[#e05397] transition-all duration-300 rounded-none backdrop-blur-md text-sm tracking-widest font-mono"
              >
                ZAMKNIJ ✕
              </button>

              <div className="absolute bottom-6 left-6 text-left font-mono">
                <p className="text-xs uppercase tracking-widest text-pink-400 font-semibold">
                  Kolejka synchronizacji
                </p>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  ID: {selectedPhoto.id}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 px-2">
        <div className="bg-[#160b13]/85 border border-[#2d1626] shadow-2xl backdrop-blur-md p-1.5 rounded-2xl flex justify-between items-center w-full overflow-x-auto no-scrollbar font-mono text-xs tracking-wider">
          {filters.map((filter) => {
            const isSelected = activeFilter === filter.id;
            return (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={`relative px-4 py-2 flex-1 text-center transition-all duration-300 rounded-xl whitespace-nowrap ${
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
