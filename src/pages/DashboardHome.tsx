import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import type { Campaign, Product } from "../lib/types";
import { Button, Input, Card, Spinner } from "../components/ui";

export default function DashboardHome() {
  const { brand } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

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
    setCampaigns((data as Campaign[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Campagne</h1>
          <p className="mt-1 text-sm text-gray-500">Gestisci le tue campagne di seeding.</p>
        </div>
        <Button onClick={() => setCreating(true)} disabled={!brand}>
          + Nuova campagna
        </Button>
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

      {loading ? (
        <Spinner />
      ) : campaigns.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-gray-100 text-2xl">
            🎁
          </div>
          <p className="font-medium text-gray-900">Nessuna campagna ancora</p>
          <p className="mt-1 text-sm text-gray-500">
            Crea la tua prima campagna per iniziare a generare link regalo.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => (
            <Link key={c.id} to={`/campaign/${c.id}`}>
              <Card className="p-5 transition-shadow hover:shadow-md">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">{c.name}</h3>
                  <span
                    className={`h-2 w-2 rounded-full ${
                      c.is_active ? "bg-green-500" : "bg-gray-300"
                    }`}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  {c.products.length} {c.products.length === 1 ? "prodotto" : "prodotti"}
                </p>
                <p className="mt-4 text-xs text-gray-400">
                  Creata il {new Date(c.created_at).toLocaleDateString("it-IT")}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
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
  const [products, setProducts] = useState<Product[]>([
    { name: "", colors: [], sizes: [] },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateProduct(i: number, field: keyof Product, value: string) {
    setProducts((prev) =>
      prev.map((p, idx) => {
        if (idx !== i) return p;
        if (field === "name") return { ...p, name: value };
        // colors / sizes: split per virgola
        return { ...p, [field]: value.split(",").map((s) => s.trim()).filter(Boolean) };
      })
    );
  }

  function addProduct() {
    setProducts((prev) => [...prev, { name: "", colors: [], sizes: [] }]);
  }

  function removeProduct(i: number) {
    setProducts((prev) => prev.filter((_, idx) => idx !== i));
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
    const { error } = await supabase.from("campaigns").insert({
      brand_id: brandId,
      name,
      products: cleaned,
    });
    setSaving(false);
    if (error) setError(error.message);
    else onCreated();
  }

  return (
    <Card className="mb-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Nuova campagna</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          ✕
        </button>
      </div>

      <form onSubmit={handleSave} className="mt-4 space-y-5">
        <Input
          label="Nome campagna"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Es. Summer Creator Seeding"
        />

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
                      onClick={() => removeProduct(i)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Rimuovi
                    </button>
                  )}
                </div>
                <div className="mt-2 space-y-2">
                  <Input
                    placeholder="Nome prodotto (es. Felpa Oversize)"
                    value={p.name}
                    onChange={(e) => updateProduct(i, "name", e.target.value)}
                  />
                  <Input
                    placeholder="Colori separati da virgola (es. Nero, Panna, Beige)"
                    value={p.colors.join(", ")}
                    onChange={(e) => updateProduct(i, "colors", e.target.value)}
                  />
                  <Input
                    placeholder="Taglie separate da virgola (es. XS, S, M, L)"
                    value={p.sizes.join(", ")}
                    onChange={(e) => updateProduct(i, "sizes", e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addProduct}
            className="mt-3 text-sm font-medium text-brand hover:underline"
          >
            + Aggiungi prodotto
          </button>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Creazione…" : "Crea campagna"}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Annulla
          </Button>
        </div>
      </form>
    </Card>
  );
}
