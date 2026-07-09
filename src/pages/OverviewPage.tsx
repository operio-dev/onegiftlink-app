import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import type { Gift, Campaign } from "../lib/types";
import { Card, Spinner, Badge } from "../components/ui";

const GIORNI_SOLLECITO = 5;

export default function OverviewPage() {
  const { brand } = useAuth();
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!brand) return setLoading(false);
      const [{ data: g }, { data: c }] = await Promise.all([
        supabase.from("gifts").select("*").eq("brand_id", brand.id).order("created_at", { ascending: false }),
        supabase.from("campaigns").select("*").eq("brand_id", brand.id),
      ]);
      setGifts((g as Gift[]) || []);
      setCampaigns((c as Campaign[]) || []);
      setLoading(false);
    }
    load();
  }, [brand]);

  if (loading) return <Spinner />;

  const sent = gifts.length;
  const claimed = gifts.filter((g) => g.status === "completed" || g.status === "shipped").length;
  const posted = gifts.filter((g) => g.posted === true).length;
  const opened = gifts.filter((g) => g.opened_at).length;
  const claimRate = sent ? Math.round((claimed / sent) * 100) : 0;
  const postRate = claimed ? Math.round((posted / claimed) * 100) : 0;
  const activation = sent ? Math.round((posted / sent) * 100) : 0;

  // tempo medio tra apertura e completamento
  const times = gifts
    .filter((g) => g.opened_at && g.completed_at)
    .map((g) => new Date(g.completed_at as string).getTime() - new Date(g.opened_at as string).getTime());
  const avgHours = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length / 36e5) : null;

  // mai aperti
  const neverOpened = gifts.filter((g) => g.status === "sent").length;

  // azioni urgenti: riscattati da oltre N giorni, nessun post registrato
  const soglia = Date.now() - GIORNI_SOLLECITO * 864e5;
  const daSollecitare = gifts.filter(
    (g) =>
      (g.status === "completed" || g.status === "shipped") &&
      g.posted !== true &&
      g.completed_at &&
      new Date(g.completed_at).getTime() < soglia
  );

  function copiaSollecito(g: Gift) {
    const testo = `Ciao ${g.instagram_handle}! Volevo assicurarmi che il pacco di ${brand?.name || "noi"} ti sia arrivato tutto bene. Se ti va e il prodotto ti piace, ci farebbe piacere vedere come lo usi. Fammi sapere se hai bisogno di qualcosa!`;
    navigator.clipboard.writeText(testo);
    setCopied(g.id);
    setTimeout(() => setCopied(null), 2000);
  }

  const stats = [
    { label: "Link inviati", value: String(sent), sub: `${campaigns.length} campagne` },
    { label: "Regali riscattati", value: String(claimed), sub: `${claimRate}% di riscatto`, good: claimRate >= 60 },
    { label: "Hanno postato", value: String(posted), sub: `${postRate}% di chi ha ricevuto`, good: postRate >= 50 },
    {
      label: "Tempo medio di risposta",
      value: avgHours !== null ? `${avgHours}h` : "-",
      sub: avgHours !== null ? "dall'apertura alla conferma" : "dati insufficienti",
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Panoramica</h1>
        <p className="mt-1 text-sm text-gray-500">Come stanno andando le tue campagne di seeding.</p>
      </div>

      {/* Activation rate */}
      {sent > 0 && (
        <Card className="mb-6 flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Activation rate</p>
            <p className="mt-1 text-4xl font-semibold tracking-tight text-gray-900">{activation}%</p>
            <p className="mt-1 text-sm text-gray-500">
              dei link inviati si e trasformato in un post pubblicato
            </p>
          </div>
          <div className="flex gap-6 text-sm">
            <div>
              <p className="text-gray-400">Aperti</p>
              <p className="mt-0.5 font-semibold text-gray-900">{opened}/{sent}</p>
            </div>
            <div>
              <p className="text-gray-400">Riscattati</p>
              <p className="mt-0.5 font-semibold text-gray-900">{claimed}/{sent}</p>
            </div>
            <div>
              <p className="text-gray-400">Postati</p>
              <p className="mt-0.5 font-semibold text-gray-900">{posted}/{sent}</p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="mt-1.5 text-3xl font-semibold tracking-tight text-gray-900">{s.value}</p>
            <p className={`mt-1 text-xs ${s.good ? "text-green-600" : "text-gray-400"}`}>{s.sub}</p>
          </Card>
        ))}
      </div>

      {/* Azioni urgenti */}
      {daSollecitare.length > 0 && (
        <Card className="mt-6 overflow-hidden border-amber-200">
          <div className="border-b border-amber-100 bg-amber-50/50 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-900">Azioni consigliate</h2>
            <p className="mt-0.5 text-sm text-gray-600">
              {daSollecitare.length} creator hanno riscattato il regalo da oltre {GIORNI_SOLLECITO} giorni senza pubblicare.
            </p>
          </div>
          <div className="divide-y divide-gray-100">
            {daSollecitare.slice(0, 5).map((g) => (
              <div key={g.id} className="flex items-center justify-between px-5 py-3.5">
                <div className="min-w-0">
                  <Link to={`/creator/${encodeURIComponent(g.instagram_handle)}`} className="text-sm font-medium text-gray-900 hover:underline">
                    {g.instagram_handle}
                  </Link>
                  <p className="text-xs text-gray-500">
                    {g.product_name || "Prodotto a scelta"} - riscattato il{" "}
                    {new Date(g.completed_at as string).toLocaleDateString("it-IT")}
                  </p>
                </div>
                <button
                  onClick={() => copiaSollecito(g)}
                  className="shrink-0 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  {copied === g.id ? "Copiato" : "Copia sollecito"}
                </button>
              </div>
            ))}
          </div>
          <p className="border-t border-gray-100 px-5 py-3 text-xs text-gray-400">
            Il messaggio viene copiato negli appunti: incollalo nel DM del creator.
          </p>
        </Card>
      )}

      {neverOpened > 0 && (
        <p className="mt-4 text-sm text-gray-500">
          {neverOpened} {neverOpened === 1 ? "link non e" : "link non sono"} ancora stati aperti dai creator.
        </p>
      )}

      {sent === 0 ? (
        <Card className="mt-6 p-12 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-gray-100 text-2xl">&#127873;</div>
          <p className="font-medium text-gray-900">Non hai ancora inviato regali</p>
          <p className="mt-1 text-sm text-gray-500">Crea una campagna e genera il tuo primo link.</p>
          <Link to="/campagne" className="mt-4 inline-block text-sm font-medium text-brand hover:underline">
            Vai alle campagne
          </Link>
        </Card>
      ) : (
        <Card className="mt-6 overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-900">Attivita recente</h2>
            <Link to="/campagne" className="text-xs font-medium text-brand hover:underline">Tutte le campagne</Link>
          </div>
          <div className="divide-y divide-gray-100">
            {gifts.slice(0, 6).map((g) => (
              <div key={g.id} className="flex items-center justify-between px-5 py-3.5">
                <div className="min-w-0">
                  <Link to={`/creator/${encodeURIComponent(g.instagram_handle)}`} className="truncate text-sm font-medium text-gray-900 hover:underline">
                    {g.instagram_handle}
                  </Link>
                  <p className="truncate text-xs text-gray-500">
                    {g.product_name || "Prodotto a scelta"}
                    {g.selected_size ? ` - taglia ${g.selected_size}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {g.posted === true && <span title="Ha postato">&#9989;</span>}
                  <StatusBadge status={g.status} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { l: string; c: "gray" | "blue" | "green" | "amber" }> = {
    sent: { l: "Inviato", c: "gray" },
    opened: { l: "Aperto", c: "amber" },
    completed: { l: "Completato", c: "blue" },
    shipped: { l: "Spedito", c: "green" },
  };
  const s = map[status] || map.sent;
  return <Badge color={s.c}>{s.l}</Badge>;
}
