// src/app/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const VALID_PINS = ["1234", "5678", "9999"]; // Twoja prosta lista PIN-ów

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlPin = searchParams.get("pin");

  const [pinInput, setPinInput] = useState("");
  const [status, setStatus] = useState<
    "idle" | "checking" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // 1. Automatyczna weryfikacja PIN-u z kodu QR (URL)
  useEffect(() => {
    if (urlPin) {
      setStatus("checking");

      // Małe opóźnienie dla płynności animacji (efekt "thinking")
      const timer = setTimeout(() => {
        if (VALID_PINS.includes(urlPin)) {
          setStatus("success");
          setTimeout(() => {
            router.push(`/capture?pin=${urlPin || pinInput}`);
          }, 1000);
        } else {
          setStatus("error");
          setErrorMessage("Kod QR zawiera nieaktywny lub niepoprawny PIN.");
        }
      }, 1200);

      return () => clearTimeout(timer);
    }
  }, [urlPin, router]);

  // 2. Obsługa ręcznego wpisania PIN-u (gdy brak kodu QR)
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput) return;

    setStatus("checking");

    setTimeout(() => {
      if (VALID_PINS.includes(pinInput)) {
        setStatus("success");
        setTimeout(() => {
          router.push(`/capture?pin=${urlPin || pinInput}`);
        }, 1000);
      } else {
        setStatus("error");
        setErrorMessage("Nieprawidłowy PIN. Spróbuj ponownie.");
        setPinInput("");
      }
    }, 800);
  };

  return (
    <main className="min-h-screen bg-[#0d070b] text-zinc-100 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-72 h-72 bg-[#e05397]/5 rounded-full blur-[60px] pointer-events-none" />

      <div className="w-full max-w-sm text-center z-10 space-y-8">
        {/* Logo i Nagłówek */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-2"
        >
          <div className="inline-flex p-3 bg-[#1a0f17] border border-[#291422] rounded-2xl text-[#e05397] font-bold text-xl shadow-inner mb-2">
            📸
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-linear-to-b from-white to-pink-200 bg-clip-text text-transparent">
            Natalia & Paweł
          </h1>
          <p className="text-sm text-zinc-400">
            Przeżyjmy ten dzień razem i uchwyćmy najlepsze chwile
          </p>
        </motion.div>

        {/* Kontener na stany aplikacji zarządzany przez Framer Motion */}
        <div className="bg-[#160b13]/60 border border-[#2d1626] rounded-3xl p-6 backdrop-blur-md shadow-2xl min-h-55 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {/* Stan 1: Sprawdzanie / Walidacja kodu */}
            {status === "checking" && (
              <motion.div
                key="checking"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center space-y-4"
              >
                <div className="w-8 h-8 border-2 border-[#e05397] border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-zinc-400 animate-pulse">
                  Weryfikacja dostępu...
                </p>
              </motion.div>
            )}

            {/* Stan 2: Sukces walidacji */}
            {status === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center space-y-3 text-emerald-400"
              >
                <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20 text-xl">
                  ✓
                </div>
                <p className="text-sm font-medium">
                  Uzyskano dostęp! Ładowanie panelu...
                </p>
              </motion.div>
            )}

            {/* Stan 3: Ekran wpisywania ręcznego lub błąd */}
            {(status === "idle" || status === "error") && (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {status === "error" ? (
                  // Komunikat o błędzie
                  <div className="space-y-3">
                    <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 py-2.5 px-4 rounded-xl">
                      {errorMessage}
                    </p>
                    <button
                      onClick={() => setStatus("idle")}
                      className="text-xs text-zinc-400 underline hover:text-zinc-200 transition"
                    >
                      Wpisz kod ręcznie
                    </button>
                  </div>
                ) : (
                  <form
                    onSubmit={handleManualSubmit}
                    className="space-y-4 text-left"
                  >
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-zinc-400 tracking-wider uppercase block">
                        Wpisz otrzymany PIN
                      </label>
                      <input
                        type="text"
                        pattern="[0-9]*"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="Nasz przykład: 1234"
                        value={pinInput}
                        onChange={(e) => setPinInput(e.target.value)}
                        className="w-full bg-[#0d070b] border border-[#291422] focus:border-[#e05397] rounded-xl px-4 py-3 text-center font-mono text-lg tracking-widest text-white focus:outline-none transition shadow-inner"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={pinInput.length < 4}
                      className="w-full bg-[#e05397] hover:bg-[#c23b7b] disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-medium py-3 rounded-xl transition shadow-lg text-sm"
                    >
                      Wejdź do aplikacji
                    </button>
                  </form>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
