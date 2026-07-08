import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { GiftPublicView, Product } from "../lib/types";
import { Button, Input, Spinner } from "../components/ui";

export default function CreatorGiftPage() {
  const { token } = useParams<{ token: string }>();
  const [gift, setGift] = useState<GiftPublicView | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [done, setDone] = useState(false);

  // selezioni
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [name, setName] = useState("");
  const [line, setLine] = useState("");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState("Italia");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!token) return;
      const { data, error } = await supabase.rpc("get_gift_by_token", {
        gift_token: token,
      });
      if (error || !data || data.length === 0) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const g = data[0] as GiftPublicView;
      setGift(g);
      if (g.status === "completed" || g.status === "shipped") {
        setDone(true);
      }
      // se il brand ha pre-scelto un prodotto, lo fissiamo
      if (g.product_name) {
        const p = g.products.find((x) => x.name === g.product_name);
        if (p) setSelectedProduct(p);
      } else if (g.products.length === 1) {
        setSelectedProduct(g.products[0]);
      }
      setLoading(false);
    }
    load();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProduct) {
      setError("Scegli un prodotto.");
      return;
    }
    if (selectedProduct.colors.length > 0 && !color) {
      setError("Scegli un colore.");
      return;
    }
    if (selectedProduct.sizes.length > 0 && !size) {
      setError("Scegli una taglia.");
      return;
    }
    if (!name || !line || !city || !zip) {
      setError("Compila tutti i campi dell'indirizzo.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const { data, error } = await supabase.rpc("submit_gift", {
      gift_token: token,
      p_color: color || null,
      p_size: size || null,
      p_name: name,
      p_line: line,
      p_city: city,
      p_zip: zip,
      p_country: country,
    });
    setSubmitting(false);
    if (error || data === false) {
      setError("Qualcosa è andato storto. Il link potrebbe essere scaduto o già usato.");
    } else {
      setDone(true);
    }
  }

  if (loading) return <Spinner />;

  if (notFound) {
    return (
      <CenterCard>
        <div className="text-4xl">🔗</div>
        <h1 className="mt-3 text-xl font-semibold text-gray-900">Link non valido</h1>
        <p className="mt-2 text-sm text-gray-600">
          Questo link non esiste o è scaduto. Contatta il brand per riceverne uno nuovo.
        </p>
      </CenterCard>
    );
  }

  if (done) {
    return (
      <CenterCard>
        <div className="text-4xl">🎉</div>
        <h1 className="mt-3 text-xl font-semibold text-gray-900">Regalo confermato!</h1>
        <p className="mt-2 text-sm text-gray-600">
          Grazie! {gift?.brand_name} preparerà la spedizione. Riceverai il tuo regalo a breve.
        </p>
      </CenterCard>
    );
  }

  if (!gift) return null;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-md">
        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          {/* Header brand */}
          <div className="border-b border-gray-100 px-6 py-6 text-center">
            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400">Un regalo da</p>
            {gift.brand_logo ? (
              <img
                src={gift.brand_logo}
                alt={gift.brand_name}
                className="mx-auto mt-2 h-12 w-auto object-contain"
              />
            ) : (
              <p className="mt-1 text-lg font-bold tracking-tight text-gray-900">
                {gift.brand_name}
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
            {/* Scelta prodotto (se più di uno e non pre-fissato) */}
            {!gift.product_name && gift.products.length > 1 && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Prodotto</label>
                <div className="grid gap-2">
                  {gift.products.map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setSelectedProduct(p);
                        setColor("");
                        setSize("");
                      }}
                      className={`rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors ${
                        selectedProduct?.name === p.name
                          ? "border-brand bg-brand/5 text-brand"
                          : "border-gray-200 text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedProduct && (
              <>
                {gift.product_name && (
                  <div className="rounded-lg bg-gray-50 px-4 py-3 text-center text-sm font-medium text-gray-900">
                    {selectedProduct.name}
                  </div>
                )}

                {/* Colori */}
                {selectedProduct.colors.length > 0 && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Colore</label>
                    <div className="flex flex-wrap gap-2">
                      {selectedProduct.colors.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setColor(c)}
                          className={`rounded-lg border px-3.5 py-2 text-sm transition-colors ${
                            color === c
                              ? "border-brand bg-brand/5 text-brand"
                              : "border-gray-200 text-gray-700 hover:border-gray-300"
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Taglie */}
                {selectedProduct.sizes.length > 0 && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Taglia</label>
                    <div className="flex flex-wrap gap-2">
                      {selectedProduct.sizes.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSize(s)}
                          className={`min-w-[3rem] rounded-lg border px-3.5 py-2 text-sm transition-colors ${
                            size === s
                              ? "border-brand bg-brand/5 text-brand"
                              : "border-gray-200 text-gray-700 hover:border-gray-300"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Indirizzo */}
            <div className="space-y-3 border-t border-gray-100 pt-5">
              <label className="block text-sm font-medium text-gray-700">Spedisci a</label>
              <Input
                placeholder="Nome e cognome"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Input
                placeholder="Indirizzo (via e numero)"
                value={line}
                onChange={(e) => setLine(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Città" value={city} onChange={(e) => setCity(e.target.value)} />
                <Input placeholder="CAP" value={zip} onChange={(e) => setZip(e.target.value)} />
              </div>
              <Input
                placeholder="Paese"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
            )}

            <Button type="submit" disabled={submitting} className="w-full py-3">
              {submitting ? "Invio…" : "Ricevi il tuo regalo 🎁"}
            </Button>

            <p className="text-center text-[11px] text-gray-400">
              I tuoi dati vengono usati solo per la spedizione di questo regalo.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

function CenterCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        {children}
      </div>
    </div>
  );
}
