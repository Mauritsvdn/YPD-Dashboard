"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Kandidaat } from "@/lib/types";
import NieuweKandidaat from "@/components/NieuweKandidaat";
import HuidigeMailing from "@/components/HuidigeMailing";
import CvAanvragen from "@/components/CvAanvragen";

type Tab = "kandidaat" | "mailing" | "aanvragen";

export default function DashboardPage() {
  const [kandidaten, setKandidaten] = useState<Kandidaat[]>([]);
  const [laden, setLaden] = useState(true);
  const [actieveTab, setActieveTab] = useState<Tab>("kandidaat");
  const router = useRouter();

  // Laad kandidaten uit Supabase bij opstarten
  useEffect(() => {
    async function laadKandidaten() {
      try {
        const res = await fetch("/api/kandidaten");
        if (!res.ok) throw new Error("Fout bij laden");
        const data = await res.json();
        setKandidaten(data);
      } catch {
        console.error("Kon kandidaten niet laden");
      } finally {
        setLaden(false);
      }
    }
    laadKandidaten();
  }, []);

  async function voegToe(k: Kandidaat) {
    const res = await fetch("/api/kandidaten", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(k),
    });
    if (res.ok) {
      setKandidaten((prev) => [...prev, k]);
      setActieveTab("mailing");
    }
  }

  async function verwijder(id: string) {
    const res = await fetch(`/api/kandidaten/${id}`, { method: "DELETE" });
    if (res.ok) {
      setKandidaten((prev) => prev.filter((k) => k.id !== id));
    }
  }

  // Na verzenden worden kandidaten gearchiveerd — verwijder ze uit de lijst
  function onVerstuurd() {
    setKandidaten([]);
  }

  async function uitloggen() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
  }

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: "kandidaat", label: "Nieuwe kandidaat" },
    { id: "mailing", label: "Huidige mailing", badge: kandidaten.length || undefined },
    { id: "aanvragen", label: "CV-aanvragen" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="https://ypd.nl/wp-content/uploads/2025/05/ypd.svg" alt="YPD" className="h-8" />
            <span className="font-semibold text-gray-700 text-sm hidden sm:block">Recruiter Dashboard</span>
          </div>
          <button
            onClick={uitloggen}
            className="text-sm text-gray-500 hover:text-gray-800 transition font-medium"
          >
            Uitloggen
          </button>
        </div>
      </header>

      {/* Gradient banner */}
      <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #7B3FA0, #E8547A, #E8823A, #F5A623)" }} />

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4">
          <nav className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActieveTab(tab.id)}
                className={`relative py-4 px-5 text-sm font-semibold transition border-b-2 ${
                  actieveTab === tab.id
                    ? "border-purple-600 text-purple-700"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full text-xs text-white font-bold" style={{ background: "linear-gradient(90deg, #E8547A, #9B59B6)" }}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Inhoud */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {actieveTab === "kandidaat" && (
          <NieuweKandidaat onToevoegen={voegToe} />
        )}
        {actieveTab === "mailing" && (
          <HuidigeMailing
            kandidaten={kandidaten}
            laden={laden}
            onVerwijder={verwijder}
            onVerstuurd={onVerstuurd}
          />
        )}
        {actieveTab === "aanvragen" && (
          <CvAanvragen />
        )}
      </main>
    </div>
  );
}
