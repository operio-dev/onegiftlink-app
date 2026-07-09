import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import type { Campaign, Gift, GiftStatus, Creator } from "../lib/types";
import { Button, Input, Card, Badge, Spinner } from "../components/ui";

const STATUS: Record<GiftStatus, { label: string; color: "gray" | "blue" | "green" | "amber" }> = {
  sent: { label: "Inviato", color: "gray" },
  opened: { label: "Aperto", color: "amber" },
  completed: { label: "Completato", color: "blue" },
  shipped: { label: "Spedito", color: "green" },
};

export default function CampaignView() {
  const { id } = useParams<{ id: string }>();
  const { brand } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGen, setShowGen] = useState(false);
  const [q, setQ] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function load() {
    if (!id) return;
    const [{ data: camp }, { data: g }] = await Promise.all([
      supabase.from("campaigns").select("*").eq("id", id).maybeSingle(),
      supabase.from("gifts").select("*").eq("campaign_id", id).order("created_at", { ascending: false }),
    ]);
    setCampaign(camp as Campaign | null);
    setGifts((g as Gift[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [id]);

  async function togglePosted(gift: Gift) {
    const next = gift.posted === true ? false : gift.posted === false ? null : true;
    await supabase.from("gifts").update({ posted: next }).eq("id", gift.id);
    setGifts((prev) => prev.map((x) => (x.id === gift.id ? { ...x, posted: next } : x)));
  }

  async function markShipped(gift: Gift) {
    await supabase.from("gifts").update({ status: "shipped" }).eq("id", gift.id);
    setGifts((prev) => prev.map((x) => (x.id === gift.id ? { ...x, status: "shipped" as GiftStatus } : x)));
  }

  async function deleteGift(gift: Gift) {
    if (!confirm(`Eliminare il link per ${gift.instagram_handle}? Il link smettera di funzionare.`)) return;
    await supabase.from("gifts").delete().eq("id", gift.id);
    setGifts((prev) => prev.filter((x) => x.id !== gift.id));
  }

  function copyLink(gift: Gift) {
    navigator.clipboard.writeText(`${window.location.origin}/g/${gift.token}`);
    setCopiedId(gift.id);
    setTimeout(() => setCopiedId(null), 1800);
  }

  function exportCSV() {
    const headers = ["Creator", "Link", "Prodotto", "Colore", "Taglia", "Nome", "Indirizzo", "Citta", "CAP", "Paese", "Stato", "Postato"];
    const rows = gifts.map((g) => [
      g.instagram_handle, `${window.location.origin}/g/${g.token}`, g.product_name || "", g.selected_color || "", g.selected_size || "",
      g.address_name || "", g.address_line || "", g.address_city || "", g.address_zip || "", g.address_country || "",
      STATUS[g.status].label, g.posted === true ? "Si" : g.posted === false ? "No" : "",
    ]);
    downloadCSV([headers, ...rows], `${campaign?.name || "campagna"}-gifts.csv`);
  }

  if (loading) return <Spinner />;
  if (!campaign)
    return (
      <div className="text-center">
        <p className="text-gray-500">Campagna non trovata.</p>
        <Link to="/campagne" className="mt-2 inline-block text-sm text-brand hover:underline">Torna alle campagne</Link>
      </div>
    );

  const claimed = gifts.filter((g) => g.status === "completed" || g.status === "shipped").length;
  const claimRate = gifts.length ? Math.round((claimed / gifts.length) * 100) : 0;
  const posted = gifts.filter((g) => g.posted === true).length;
  const filtered = gifts.filter((g) => g.instagram_handle.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <Link to="/campagne" className="mb-4 inline-block text-sm text-gray-500 hover:text-gray-800">&larr; Campagne</Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{campaign.name}</h1>
          <p className="mt-1 text-sm text-gray-500">{campaign.products.length} prodotti in campagna</p>
        </div>
        <div className="flex gap-2">
          {gifts.length > 0 && <Button variant="secondary" onClick={exportCSV}>Esporta CSV</Button>}
          <Button onClick={() => setShowGen(true)}>+ Genera link</Button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-5"><p className="text-sm text-gray-500">Link inviati</p><p className="mt-1 text-2xl font-semibold">{gifts.length}</p></Card>
        <Card className="p-5"><p className="text-sm text-gray-500">Riscattati</p><p className="mt-1 text-2xl font-semibold">{claimed}</p></Card>
        <Card className="p-5"><p className="text-sm text-gray-500">Tasso riscatto</p><p className="mt-1 text-2xl font-semibold">{claimRate}%</p></Card>
        <Card className="p-5"><p className="text-sm text-gray-500">Hanno postato</p><p className="mt-1 text-2xl font-semibold">{posted}</p></Card>
      </div>

      {showGen && brand && (
        <GenerateLinks
          campaign={campaign}
          brandId={brand.id}
          expiryDays={brand.default_expiry_days ?? null}
          onClose={() => setShowGen(false)}
          onDone={() => { setShowGen(false); load(); }}
        />
      )}

      {gifts.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="font-medium text-gray-900">Nessun link generato</p>
          <p className="mt-1 text-sm text-gray-500">Genera i link e inviali ai creator.</p>
        </Card>
      ) : (
        <>
          <div className="mb-4 max-w-xs">
            <Input placeholder="Cerca un creator..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-3 font-medium">Creator</th>
                    <th className="px-4 py-3 font-medium">Prodotto</th>
                    <th className="px-4 py-3 font-medium">Taglia</th>
                    <th className="px-4 py-3 font-medium">Indirizzo</th>
                    <th className="px-4 py-3 font-medium">Stato</th>
                    <th className="px-4 py-3 font-medium">Postato</th>
                    <th className="px-4 py-3 text-right font-medium">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((g) => (
                    <tr key={g.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-medium text-gray-900">{g.instagram_handle}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {g.product_name || <span className="text-gray-400">a scelta</span>}
                        {g.selected_color && <span className="text-gray-400"> - {g.selected_color}</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{g.selected_size || <span className="text-gray-400">-</span>}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {g.address_city ? <span className="text-xs">{g.address_line}, {g.address_city} {g.address_zip}</span> : <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-4 py-3"><Badge color={STATUS[g.status].color}>{STATUS[g.status].label}</Badge></td>
                      <td className="px-4 py-3">
                        <button onClick={() => togglePosted(g)} className="text-lg" title="Clicca per cambiare">
                          {g.posted === true ? "\u2705" : g.posted === false ? "\u274C" : "\u23F3"}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => copyLink(g)} className="rounded-md px-2 py-1 text-xs font-medium text-brand hover:bg-blue-50">
                            {copiedId === g.id ? "Copiato" : "Copia link"}
                          </button>
                          {g.status === "completed" && (
                            <button onClick={() => markShipped(g)} className="rounded-md px-2 py-1 text-xs font-medium text-green-600 hover:bg-green-50">Spedito</button>
                          )}
                          <button onClick={() => deleteGift(g)} className="rounded-md p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500" title="Elimina link">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                              <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function downloadCSV(rows: string[][], filename: string) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ====================== Generazione link (singola o massiva) ====================== */
function GenerateLinks({
  campaign,
  brandId,
  expiryDays,
  onClose,
  onDone,
}: {
  campaign: Campaign;
  brandId: string;
  expiryDays: number | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [tab, setTab] = useState<"rubrica" | "nuovi">("rubrica");
  const [creators, setCreators] = useState<Creator[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [newHandles, setNewHandles] = useState("");
  const [search, setSearch] = useState("");
  const [productName, setProductName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<{ handle: string; link: string }[] | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  useEffect(() => {
    supabase
      .from("creators")
      .select("*")
      .eq("brand_id", brandId)
      .order("instagram_handle")
      .then(({ data }) => setCreators((data as Creator[]) || []));
  }, [brandId]);

  function parseNew(): string[] {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const part of newHandles.split(/[\n,;]/)) {
      const t = part.trim().replace(/^@/, "");
      if (!t) continue;
      const h = "@" + t;
      if (!seen.has(h)) {
        seen.add(h);
        out.push(h);
      }
    }
    return out;
  }

  const handles = tab === "rubrica" ? [...selected] : parseNew();

  async function generate() {
    if (handles.length === 0) return setError("Seleziona almeno un creator.");
    setError(null);
    setSaving(true);

    const expiresAt = expiryDays ? new Date(Date.now() + expiryDays * 864e5).toISOString() : null;

    // 1. crea i regali
    const { data, error } = await supabase
      .from("gifts")
      .insert(
        handles.map((h) => ({
          campaign_id: campaign.id,
          brand_id: brandId,
          instagram_handle: h,
          product_name: productName || null,
          expires_at: expiresAt,
        }))
      )
      .select("instagram_handle, token");

    if (error) {
      setSaving(false);
      return setError(error.message);
    }

    // 2. i nuovi handle entrano in rubrica automaticamente
    await supabase
      .from("creators")
      .upsert(
        handles.map((h) => ({ brand_id: brandId, instagram_handle: h })),
        { onConflict: "brand_id,instagram_handle", ignoreDuplicates: true }
      );

    setSaving(false);
    setResults(
      (data as { instagram_handle: string; token: string }[]).map((d) => ({
        handle: d.instagram_handle,
        link: `${window.location.origin}/g/${d.token}`,
      }))
    );
  }

  function copyAll() {
    if (!results) return;
    navigator.clipboard.writeText(results.map((r) => `${r.handle}\t${r.link}`).join("\n"));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  }

  const filteredCreators = creators.filter((c) =>
    c.instagram_handle.toLowerCase().includes(search.toLowerCase()) ||
    (c.name || "").toLowerCase().includes(search.toLowerCase())
  );

  /* ---------------------------- Schermata risultati --------------------------- */
  if (results) {
    return (
      <Card className="mb-6 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            {results.length} {results.length === 1 ? "link generato" : "link generati"}
          </h2>
          <button onClick={onDone} className="text-gray-400 hover:text-gray-600">&#10005;</button>
        </div>

        <div className="mt-4 max-h-72 overflow-y-auto rounded-lg border border-gray-200">
          {results.map((r) => (
            <div key={r.link} className="flex items-center gap-3 border-b border-gray-100 px-3 py-2.5 last:border-0">
              <span className="w-36 shrink-0 truncate text-sm font-medium text-gray-900">{r.handle}</span>
              <span className="flex-1 truncate text-xs text-gray-500">{r.link}</span>
              <button
                onClick={() => navigator.clipboard.writeText(r.link)}
                className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-brand hover:bg-blue-50"
              >
                Copia
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={copyAll}>{copiedAll ? "Copiati" : "Copia tutti"}</Button>
          <Button
            variant="secondary"
            onClick={() => downloadCSV([["Creator", "Link"], ...results.map((r) => [r.handle, r.link])], `${campaign.name}-link.csv`)}
          >
            Esporta CSV
          </Button>
          <Button variant="ghost" onClick={onDone}>Fatto</Button>
        </div>
        <p className="mt-3 text-xs text-gray-400">
          Potrai ricopiare ogni link dalla tabella qui sotto.
          {expiryDays ? ` Scadono tra ${expiryDays} giorni.` : ""}
        </p>
      </Card>
    );
  }

  /* ----------------------------- Schermata scelta ----------------------------- */
  return (
    <Card className="mb-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Genera link regalo</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&#10005;</button>
      </div>

      <div className="mt-4 flex gap-1 rounded-lg bg-gray-100 p-1">
        <button
          onClick={() => setTab("rubrica")}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${tab === "rubrica" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
        >
          Dalla rubrica ({creators.length})
        </button>
        <button
          onClick={() => setTab("nuovi")}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${tab === "nuovi" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
        >
          Nuovi handle
        </button>
      </div>

      {tab === "rubrica" ? (
        <div className="mt-4">
          {creators.length === 0 ? (
            <p className="rounded-lg bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
              Rubrica vuota. Usa "Nuovi handle": i creator verranno aggiunti in automatico.
            </p>
          ) : (
            <>
              <div className="mb-3 flex items-center gap-2">
                <Input placeholder="Cerca..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1" />
                <button
                  onClick={() =>
                    setSelected(
                      selected.size === filteredCreators.length
                        ? new Set()
                        : new Set(filteredCreators.map((c) => c.instagram_handle))
                    )
                  }
                  className="shrink-0 whitespace-nowrap text-xs font-medium text-brand hover:underline"
                >
                  {selected.size === filteredCreators.length ? "Deseleziona tutti" : "Seleziona tutti"}
                </button>
              </div>

              <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-200">
                {filteredCreators.map((c) => (
                  <label key={c.id} className="flex cursor-pointer items-center gap-3 border-b border-gray-100 px-3 py-2.5 last:border-0 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={selected.has(c.instagram_handle)}
                      onChange={(e) => {
                        const next = new Set(selected);
                        if (e.target.checked) next.add(c.instagram_handle);
                        else next.delete(c.instagram_handle);
                        setSelected(next);
                      }}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-900">{c.instagram_handle}</span>
                    {c.name && <span className="text-xs text-gray-500">{c.name}</span>}
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="mt-4">
          <textarea
            value={newHandles}
            onChange={(e) => setNewHandles(e.target.value)}
            rows={5}
            placeholder={"@sophie.creates\n@mayaruns\n@jordan.kim"}
            className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 font-mono text-xs outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
          <p className="mt-1.5 text-xs text-gray-400">Uno per riga, oppure separati da virgola. Verranno aggiunti alla rubrica.</p>
        </div>
      )}

      <label className="mt-5 block">
        <span className="mb-1.5 block text-sm font-medium text-gray-700">Prodotto (opzionale)</span>
        <select
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        >
          <option value="">Il creator sceglie tra tutti i prodotti</option>
          {campaign.products.map((p, i) => (
            <option key={i} value={p.name}>{p.name}</option>
          ))}
        </select>
      </label>

      {error && <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

      <div className="mt-5 flex items-center gap-3">
        <Button onClick={generate} disabled={saving || handles.length === 0}>
          {saving ? "Generazione..." : handles.length > 1 ? `Genera ${handles.length} link` : "Genera link"}
        </Button>
        <Button variant="ghost" onClick={onClose}>Annulla</Button>
        {handles.length > 0 && <span className="text-sm text-gray-500">{handles.length} selezionati</span>}
      </div>
    </Card>
  );
}
