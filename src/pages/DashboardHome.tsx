import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import type { Campaign, Product } from "../lib/types";
import { Button, Input, Card, Spinner } from "../components/ui";

export default function DashboardHome() {
  const { brand } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Campaign | null>(null);

  async function load() {
    if (!brand) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("campaigns")
      .select("*")
      .eq("brand_id", brand.id)
      .order("created_at", { ascending: false });
    const list = (data as Campaign[]) || [];
    setCampaigns(list);

    const { data: gifts } = await supabase.from("gifts").select("campaign_id").eq("brand_id", brand.id);
    const map: Record<string, number> = {};
    for (const g of (gifts as { campaign_id: string }[]) || []) {
      map[g.campaign_id] = (map[g.campaign_id] || 0) + 1;
    }
    setCounts(map);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [brand]);

  async function confirmDelete() {
    if (!deleting) return;
    await supabase.from("campaigns").delete().eq("id", deleting.id);
    setDeleting(null);
    load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Campagne</h1>
          <p className="mt-1 text-sm text-gray-500">Gestisci le tue campagne di seeding.</p>
        </div>
        <Button onClick={() => setCreating(true)} disabled={!brand}>+ Nuova campagna</Button>
      </div>

      {creating && (
        <NewCampaignForm
          brandId={brand!.id}
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            load();
          }}
        />
      )}

      {deleting && (
        <ConfirmDelete
          campaign={deleting}
          giftCount={counts[deleting.id] || 0}
          onCancel={() => setDeleting(null)}
          onConfirm={confirmDelete}
        />
      )}

      {loading ? (
        <Spinner />
      ) : campaigns.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-gray-100 text-2xl">&#127873;</div>
          <p className="font-medium text-gray-900">Nessuna campagna ancora</p>
          <p className="mt-1 text-sm text-gray-500">Crea la tua prima campagna per generare link regalo.</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => (
            <Card key={c.id} className="group relative p-5 transition-shadow hover:shadow-md">
              <button
                onClick={() => setDeleting(c)}
                title="Elimina campagna"
                className="absolute right-3 top-3 rounded-md p-1.5 text-gray-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                  <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6" />
                </svg>
              </button>

              <Link to={`/campagna/${c.id}`} className="block">
                <div className="flex items-center gap-2 pr-6">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${c.is_active ? "bg-green-500" : "bg-gray-300"}`} />
                  <h3 className="truncate font-semibold text-gray-900">{c.name}</h3>
                </div>
                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-2xl font-semibold text-gray-900">{counts[c.id] || 0}</span>
                  <span className="text-sm text-gray-500">link generati</span>
                </div>
                <p className="mt-3 text-xs text-gray-400">
                  {c.products.length} {c.products.length === 1 ? "prodotto" : "prodotti"} - creata il{" "}
                  {new Date(c.created_at).toLocaleDateString("it-IT")}
                </p>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ConfirmDelete({
  campaign,
  giftCount,
  onCancel,
  onConfirm,
}: {
  campaign: Campaign;
  giftCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <Card className="w-full max-w-md p-6">
        <h2 className="text-base font-semibold text-gray-900">Eliminare "{campaign.name}"?</h2>
        <p className="mt-2 text-sm text-gray-600">
          {giftCount > 0
            ? `Verranno eliminati anche ${giftCount} link regalo e i relativi dati. I link gia inviati ai creator smetteranno di funzionare.`
            : "Questa campagna non ha link generati."}
        </p>
        <p className="mt-2 text-sm font-medium text-red-600">L'operazione non e reversibile.</p>
        <div className="mt-5 flex gap-2">
          <Button variant="danger" onClick={onConfirm}>Elimina definitivamente</Button>
          <Button variant="ghost" onClick={onCancel}>Annulla</Button>
        </div>
      </Card>
    </div>
  );
}

function NewCampaignForm({
  brandId,
  onClose,
  onCreated,
}: {
  brandId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [products, setProducts] = useState<Product[]>([{ name: "", colors: [], sizes: [] }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateProduct(i: number, field: keyof Product, value: string) {
    setProducts((prev) =>
      prev.map((p, idx) => {
        if (idx !== i) return p;
        if (field === "name") return { ...p, name: value };
        return { ...p, [field]: value.split(",").map((s) => s.trim()).filter(Boolean) };
      })
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const cleaned = products.filter((p) => p.name.trim());
    if (!name.trim() || cleaned.length === 0) {
      setError("Inserisci il nome della campagna e almeno un prodotto.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("campaigns").insert({ brand_id: brandId, name, products: cleaned });
    setSaving(false);
    if (error) setError(error.message);
    else onCreated();
  }

  return (
    <Card className="mb-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Nuova campagna</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&#10005;</button>
      </div>

      <form onSubmit={handleSave} className="mt-4 space-y-5">
        <Input label="Nome campagna" value={name} onChange={(e) => setName(e.target.value)} placeholder="Es. Summer Creator Seeding" />

        <div>
          <span className="mb-2 block text-sm font-medium text-gray-700">Prodotti</span>
          <div className="space-y-3">
            {products.map((p, i) => (
              <div key={i} className="rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500">Prodotto {i + 1}</span>
                  {products.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setProducts((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Rimuovi
                    </button>
                  )}
                </div>
                <div className="mt-2 space-y-2">
                  <Input placeholder="Nome prodotto (es. Felpa Oversize)" value={p.name} onChange={(e) => updateProduct(i, "name", e.target.value)} />
                  <Input placeholder="Colori separati da virgola (es. Nero, Panna)" value={p.colors.join(", ")} onChange={(e) => updateProduct(i, "colors", e.target.value)} />
                  <Input placeholder="Taglie separate da virgola (es. XS, S, M, L)" value={p.sizes.join(", ")} onChange={(e) => updateProduct(i, "sizes", e.target.value)} />
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setProducts((prev) => [...prev, { name: "", colors: [], sizes: [] }])}
            className="mt-3 text-sm font-medium text-brand hover:underline"
          >
            + Aggiungi prodotto
          </button>
        </div>

        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>{saving ? "Creazione..." : "Crea campagna"}</Button>
          <Button type="button" variant="ghost" onClick={onClose}>Annulla</Button>
        </div>
      </form>
    </Card>
  );
}
