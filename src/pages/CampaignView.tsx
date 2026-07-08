import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import type { Campaign, Gift, GiftStatus } from "../lib/types";
import { Button, Input, Card, Badge, Spinner } from "../components/ui";

const STATUS_LABELS: Record<GiftStatus, { label: string; color: "gray" | "blue" | "green" | "amber" }> = {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function togglePosted(gift: Gift) {
    const newVal = gift.posted ? false : true;
    await supabase.from("gifts").update({ posted: newVal }).eq("id", gift.id);
    setGifts((prev) => prev.map((x) => (x.id === gift.id ? { ...x, posted: newVal } : x)));
  }

  async function markShipped(gift: Gift) {
    await supabase.from("gifts").update({ status: "shipped" }).eq("id", gift.id);
    setGifts((prev) =>
      prev.map((x) => (x.id === gift.id ? { ...x, status: "shipped" as GiftStatus } : x))
    );
  }

  function exportCSV() {
    const headers = [
      "Creator",
      "Prodotto",
      "Colore",
      "Taglia",
      "Nome",
      "Indirizzo",
      "Citta",
      "CAP",
      "Paese",
      "Stato",
      "Postato",
    ];
    const rows = gifts.map((g) => [
      g.instagram_handle,
      g.product_name || "",
      g.selected_color || "",
      g.selected_size || "",
      g.address_name || "",
      g.address_line || "",
      g.address_city || "",
      g.address_zip || "",
      g.address_country || "",
      STATUS_LABELS[g.status].label,
      g.posted === true ? "Si" : g.posted === false ? "No" : "",
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${campaign?.name || "campagna"}-gifts.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <Spinner />;
  if (!campaign)
    return (
      <div className="text-center">
        <p className="text-gray-500">Campagna non trovata.</p>
        <Link to="/" className="mt-2 inline-block text-sm text-brand hover:underline">
          ← Torna alle campagne
        </Link>
      </div>
    );

  const claimed = gifts.filter((g) => g.status === "completed" || g.status === "shipped").length;
  const claimRate = gifts.length ? Math.round((claimed / gifts.length) * 100) : 0;

  return (
    <div>
      <Link to="/" className="mb-4 inline-block text-sm text-gray-500 hover:text-gray-800">
        ← Campagne
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{campaign.name}</h1>
          <p className="mt-1 text-sm text-gray-500">{campaign.products.length} prodotti in campagna</p>
        </div>
        <div className="flex gap-2">
          {gifts.length > 0 && (
            <Button variant="secondary" onClick={exportCSV}>
              ↓ Esporta CSV
            </Button>
          )}
          <Button onClick={() => setShowGen(true)}>+ Genera link</Button>
        </div>
      </div>

      {/* Metriche */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <Card className="p-5">
          <p className="text-sm text-gray-500">Link inviati</p>
          <p className="mt-1 text-2xl font-semibold">{gifts.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-gray-500">Riscattati</p>
          <p className="mt-1 text-2xl font-semibold">{claimed}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-gray-500">Tasso di riscatto</p>
          <p className="mt-1 text-2xl font-semibold">{claimRate}%</p>
        </Card>
      </div>

      {showGen && (
        <GenerateLinkForm
          campaign={campaign}
          brandId={brand!.id}
          onClose={() => setShowGen(false)}
          onGenerated={() => {
            setShowGen(false);
            load();
          }}
        />
      )}

      {/* Tabella gift */}
      {gifts.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="font-medium text-gray-900">Nessun link generato</p>
          <p className="mt-1 text-sm text-gray-500">
            Genera il primo link regalo e invialo a un creator.
          </p>
        </Card>
      ) : (
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
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {gifts.map((g) => (
                  <tr key={g.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-gray-900">{g.instagram_handle}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {g.product_name || <span className="text-gray-400">—</span>}
                      {g.selected_color && (
                        <span className="text-gray-400"> · {g.selected_color}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {g.selected_size || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {g.address_city ? (
                        <span>
                          {g.address_line}, {g.address_city} {g.address_zip}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={STATUS_LABELS[g.status].color}>
                        {STATUS_LABELS[g.status].label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => togglePosted(g)}
                        className="text-lg"
                        title="Segna se il creator ha postato"
                      >
                        {g.posted === true ? "✅" : g.posted === false ? "❌" : "⏳"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      {g.status === "completed" && (
                        <button
                          onClick={() => markShipped(g)}
                          className="text-xs font-medium text-brand hover:underline"
                        >
                          Segna spedito
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function GenerateLinkForm({
  campaign,
  brandId,
  onClose,
  onGenerated,
}: {
  campaign: Campaign;
  brandId: string;
  onClose: () => void;
  onGenerated: () => void;
}) {
  const [handle, setHandle] = useState("");
  const [productName, setProductName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!handle.trim()) {
      setError("Inserisci l'handle del creator.");
      return;
    }
    setError(null);
    setSaving(true);
    const cleanHandle = handle.trim().replace(/^@/, "");
    const { data, error } = await supabase
      .from("gifts")
      .insert({
        campaign_id: campaign.id,
        brand_id: brandId,
        instagram_handle: "@" + cleanHandle,
        product_name: productName || null,
      })
      .select("token")
      .single();
    setSaving(false);
    if (error) {
      setError(error.message);
    } else {
      const link = `${window.location.origin}/g/${data.token}`;
      setGeneratedLink(link);
    }
  }

  function copyLink() {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <Card className="mb-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Genera link regalo</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          ✕
        </button>
      </div>

      {!generatedLink ? (
        <form onSubmit={handleGenerate} className="mt-4 space-y-4">
          <Input
            label="Handle Instagram del creator"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="@sophie.creates"
          />
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Prodotto (opzionale)
            </span>
            <select
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            >
              <option value="">Il creator sceglie tra tutti i prodotti</option>
              {campaign.products.map((p, i) => (
                <option key={i} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
          )}

          <Button type="submit" disabled={saving}>
            {saving ? "Generazione…" : "Genera link"}
          </Button>
        </form>
      ) : (
        <div className="mt-4">
          <p className="text-sm text-gray-600">
            Link per <strong>@{handle.replace(/^@/, "")}</strong> pronto. Copialo e invialo in DM:
          </p>
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-gray-50 p-3">
            <span className="flex-1 truncate text-sm text-gray-700">{generatedLink}</span>
            <Button onClick={copyLink}>{copied ? "Copiato ✓" : "Copia"}</Button>
          </div>
          <div className="mt-4 flex gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setGeneratedLink(null);
                setHandle("");
                setProductName("");
              }}
            >
              + Genera un altro
            </Button>
            <Button variant="ghost" onClick={onGenerated}>
              Fatto
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
