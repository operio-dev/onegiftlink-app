import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import type { Gift } from "../lib/types";
import { Card, Spinner, Input } from "../components/ui";

interface CreatorStats {
  handle: string;
  total: number;
  claimed: number;
  posted: number;
  ghosted: number;
  lastDate: string;
}

export default function CreatorsPage() {
  const { brand } = useAuth();
  const [stats, setStats] = useState<CreatorStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    async function load() {
      if (!brand) {
        setLoading(false);
        return;
      }
      const { data } = await supabase.from("gifts").select("*").eq("brand_id", brand.id);
      const gifts = (data as Gift[]) || [];

      const byHandle = new Map<string, CreatorStats>();
      for (const g of gifts) {
        const h = g.instagram_handle;
        const cur = byHandle.get(h) || {
          handle: h,
          total: 0,
          claimed: 0,
          posted: 0,
          ghosted: 0,
          lastDate: g.created_at,
        };
        cur.total++;
        if (g.status === "completed" || g.status === "shipped") cur.claimed++;
        if (g.posted === true) cur.posted++;
        if (g.posted === false) cur.ghosted++;
        if (g.created_at > cur.lastDate) cur.lastDate = g.created_at;
        byHandle.set(h, cur);
      }
      setStats([...byHandle.values()].sort((a, b) => b.total - a.total));
      setLoading(false);
    }
    load();
  }, [brand]);

  if (loading) return <Spinner />;

  const filtered = stats.filter((s) => s.handle.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Creator</h1>
        <p className="mt-1 text-sm text-gray-500">
          Chi ricambia con un post e chi no. Piu regali invii, piu il quadro diventa affidabile.
        </p>
      </div>

      {stats.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-gray-100 text-2xl">&#128100;</div>
          <p className="font-medium text-gray-900">Nessun creator ancora</p>
          <p className="mt-1 text-sm text-gray-500">Compariranno qui appena generi il primo link.</p>
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
                    <th className="px-4 py-3 font-medium">Regali</th>
                    <th className="px-4 py-3 font-medium">Riscattati</th>
                    <th className="px-4 py-3 font-medium">Ha postato</th>
                    <th className="px-4 py-3 font-medium">Affidabilita</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => {
                    const rate = s.claimed ? Math.round((s.posted / s.claimed) * 100) : null;
                    return (
                      <tr key={s.handle} className="border-b border-gray-100 last:border-0">
                        <td className="px-4 py-3 font-medium text-gray-900">{s.handle}</td>
                        <td className="px-4 py-3 text-gray-600">{s.total}</td>
                        <td className="px-4 py-3 text-gray-600">{s.claimed}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {s.posted}
                          {s.ghosted > 0 && <span className="ml-1 text-xs text-red-500">({s.ghosted} no)</span>}
                        </td>
                        <td className="px-4 py-3">
                          {rate === null ? (
                            <span className="text-gray-400">-</span>
                          ) : (
                            <ReliabilityBar rate={rate} />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <p className="mt-4 text-xs text-gray-400">
            L'affidabilita e calcolata sui regali riscattati che hai marcato come postati.
          </p>
        </>
      )}
    </div>
  );
}

function ReliabilityBar({ rate }: { rate: number }) {
  const color = rate >= 70 ? "bg-green-500" : rate >= 40 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-200">
        <div className={`h-full ${color}`} style={{ width: `${rate}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-600">{rate}%</span>
    </div>
  );
}      if (g.product_name) {
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
          Questo link non esiste o è scaduto. Contatta il brand per riceverne uno nuovo.
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
            {!gift.product_name && gift.products.length > 1 && (
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Scegli il tuo regalo
                </label>
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
                      className={`rounded-xl border px-4 py-3.5 text-left text-sm font-medium transition-all ${
                        selectedProduct?.name === p.name
                          ? "border-gray-900 bg-gray-900 text-white shadow-sm"
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
                      {selectedProduct.colors.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setColor(c)}
                          className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                            color === c
                              ? "border-gray-900 bg-gray-900 text-white"
                              : "border-gray-200 text-gray-700 hover:border-gray-400"
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
                    <label className="mb-2 block text-sm font-medium text-gray-700">Taglia</label>
                    <div className="flex flex-wrap gap-2">
                      {selectedProduct.sizes.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSize(s)}
                          className={`min-w-[3.25rem] rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                            size === s
                              ? "border-gray-900 bg-gray-900 text-white"
                              : "border-gray-200 text-gray-700 hover:border-gray-400"
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
              className="w-full rounded-xl bg-gray-900 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-black disabled:opacity-50"
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
