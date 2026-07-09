import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { GiftPublicView, Product } from "../lib/types";
import { Input } from "../components/ui";

export default function CreatorGiftPage() {
  const { token } = useParams<{ token: string }>();
  const [gift, setGift] = useState<GiftPublicView | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [done, setDone] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [name, setName] = useState("");
  const [line, setLine] = useState("");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState("Italia");
  const accent = gift?.brand_accent || "#111111";
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!token) return;
      const { data, error } = await supabase.rpc("get_gift_by_token", { gift_token: token });
      if (error || !data || data.length === 0) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const g = data[0] as GiftPublicView;
      setGift(g);
      // segna il link come aperto (solo la prima volta)
      supabase.rpc("mark_gift_opened", { gift_token: token });
      if (g.brand_country) setCountry(g.brand_country);
      if (g.status === "completed" || g.status === "shipped") setDone(true);
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
    if (!selectedProduct) return setError("Scegli un prodotto.");
    if (selectedProduct.colors.length > 0 && !color) return setError("Scegli un colore.");
    if (selectedProduct.sizes.length > 0 && !size) return setError("Scegli una taglia.");
    if (!name || !line || !city || !zip) return setError("Compila tutti i campi dell'indirizzo.");
    setError(null);
    setSubmitting(true);
    const { data, error } = await supabase.rpc("submit_gift", {
      gift_token: token,
      p_product: selectedProduct.name,
      p_color: color || null,
      p_size: size || null,
      p_name: name,
      p_line: line,
      p_city: city,
      p_zip: zip,
      p_country: country,
    });
    setSubmitting(false);
    if (error) {
      setError("Qualcosa è andato storto. Riprova tra qualche istante.");
      return;
    }
    switch (data as string) {
      case "ok":
        setDone(true);
        break;
      case "out_of_stock":
        setError("Questa variante e appena finita. Scegline un'altra, se disponibile.");
        break;
      case "used":
        setDone(true);
        break;
      case "expired":
        setNotFound(true);
        break;
      default:
        setError("Il link non e piu valido. Contatta il brand.");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
      </div>
    );
  }

  if (notFound) {
    return (
      <CenterCard>
        <div className="text-5xl">🔗</div>
        <h1 className="mt-4 text-xl font-semibold text-gray-900">Link non valido</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          Questo link non esiste, è scaduto o è già stato usato. Contatta il brand per riceverne uno nuovo.
        </p>
      </CenterCard>
    );
  }

  if (gift && !gift.product_name && gift.products.length > 0 &&
      gift.products.every((p) => p.stock != null && ((gift.availability || [])
        .filter((a) => a.product === p.name)
        .reduce((s, a) => s + a.count, 0) >= (p.stock as number)))) {
    return (
      <CenterCard>
        <div className="text-5xl">&#128533;</div>
        <h1 className="mt-4 text-xl font-semibold text-gray-900">Regali esauriti</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          I pezzi disponibili per questa campagna sono finiti. Contatta {gift.brand_name} per saperne di piu.
        </p>
      </CenterCard>
    );
  }

  if (done) {
    return (
      <CenterCard>
        <div className="text-5xl">🎉</div>
        <h1 className="mt-4 text-xl font-semibold text-gray-900">Regalo confermato!</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          Grazie! {gift?.brand_name} preparerà la spedizione. Riceverai il tuo regalo a breve.
        </p>
      </CenterCard>
    );
  }

  if (!gift) return null;

  // quanti pezzi gia riscattati per prodotto/colore
  const claimedOf = (product: string, col?: string) =>
    (gift.availability || [])
      .filter((a) => a.product === product && (col === undefined || a.color === col))
      .reduce((s, a) => s + a.count, 0);

  const productSoldOut = (p: Product) =>
    p.stock != null && claimedOf(p.name) >= p.stock;

  const colorSoldOut = (p: Product, c: string) =>
    p.colorStock?.[c] != null && claimedOf(p.name, c) >= (p.colorStock[c] as number);

  const availableProducts = gift.products.filter((p) => !productSoldOut(p));

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-md">
        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xl shadow-gray-200/50">
          {/* Header brand con logo grande */}
          <div className="border-b border-gray-100 bg-white px-6 py-8 text-center">
            <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-gray-400">
              Un regalo da
            </p>
            {gift.brand_logo ? (
              <img
                src={gift.brand_logo}
                alt={gift.brand_name}
                className="mx-auto mt-3 h-16 w-auto max-w-[70%] object-contain sm:h-20"
              />
            ) : (
              <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
                {gift.brand_name}
              </p>
            )}
            {gift.brand_welcome && (
              <p className="mx-auto mt-4 max-w-xs text-sm leading-relaxed text-gray-500">
                {gift.brand_welcome}
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 px-6 py-7">
            {/* Riquadro prodotto (predisposto per immagine futura) */}
            {selectedProduct && (
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="flex aspect-[4/3] items-center justify-center">
                  <div className="text-center">
                    <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white/70 text-3xl shadow-sm">
                      🎁
                    </div>
                    <p className="mt-3 px-4 text-sm font-semibold text-gray-700">
                      {selectedProduct.name}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Scelta prodotto se più di uno */}
            {!gift.product_name && availableProducts.length > 1 && (
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Scegli il tuo regalo
                </label>
                <div className="grid gap-2">
                  {availableProducts.map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setSelectedProduct(p);
                        setColor("");
                        setSize("");
                      }}
                      style={selectedProduct?.name === p.name ? { backgroundColor: accent, borderColor: accent } : undefined}
                      className={`rounded-xl border px-4 py-3.5 text-left text-sm font-medium transition-all ${
                        selectedProduct?.name === p.name
                          ? "text-white shadow-sm"
                          : "border-gray-200 text-gray-700 hover:border-gray-400"
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
                {/* Colori */}
                {selectedProduct.colors.length > 0 && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Colore</label>
                    <div className="flex flex-wrap gap-2">
                      {selectedProduct.colors.map((c) => {
                        const out = colorSoldOut(selectedProduct, c);
                        return (
                          <button
                            key={c}
                            type="button"
                            disabled={out}
                            onClick={() => setColor(c)}
                            style={color === c ? { backgroundColor: accent, borderColor: accent } : undefined}
                            className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                              out
                                ? "cursor-not-allowed border-gray-100 text-gray-300 line-through"
                                : color === c
                                ? "text-white"
                                : "border-gray-200 text-gray-700 hover:border-gray-400"
                            }`}
                          >
                            {c}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Taglie */}
                {selectedProduct.sizes.length > 0 && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Taglia</label>
                    <div className="flex flex-wrap gap-2">
                      {selectedProduct.sizes.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSize(s)}
                          style={size === s ? { backgroundColor: accent, borderColor: accent } : undefined}
                          className={`min-w-[3.25rem] rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                            size === s ? "text-white" : "border-gray-200 text-gray-700 hover:border-gray-400"
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
            <div className="space-y-3 border-t border-gray-100 pt-6">
              <label className="block text-sm font-semibold text-gray-900">Dove lo spediamo?</label>
              <Input placeholder="Nome e cognome" value={name} onChange={(e) => setName(e.target.value)} />
              <Input placeholder="Indirizzo (via e numero)" value={line} onChange={(e) => setLine(e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Città" value={city} onChange={(e) => setCity(e.target.value)} />
                <Input placeholder="CAP" value={zip} onChange={(e) => setZip(e.target.value)} />
              </div>
              <Input placeholder="Paese" value={country} onChange={(e) => setCountry(e.target.value)} />
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
            )}

            <button
              type="submit"
              disabled={submitting}
              style={{ backgroundColor: accent }}
              className="w-full rounded-xl py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Invio…" : "Ricevi il tuo regalo 🎁"}
            </button>

            <p className="text-center text-[11px] leading-relaxed text-gray-400">
              I tuoi dati vengono usati solo per la spedizione di questo regalo.
            </p>
          </form>
        </div>

        {/* Footer OneGiftLink */}
        <p className="mt-5 text-center text-[11px] text-gray-400">
          Powered by OneGiftLink
        </p>
      </div>
    </div>
  );
}

function CenterCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 px-4">
      <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-10 text-center shadow-xl shadow-gray-200/50">
        {children}
      </div>
    </div>
  );
}
