import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import type { Gift, Creator } from "../lib/types";
import { Card, Spinner, Input, Button } from "../components/ui";

interface Row {
  handle: string;
  id?: string;
  name: string | null;
  email: string | null;
  notes: string | null;
  total: number;
  claimed: number;
  posted: number;
  ghosted: number;
}

export default function CreatorsPage() {
  const { brand } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);

  async function load() {
    if (!brand) {
      setLoading(false);
      return;
    }
    const [{ data: cr }, { data: gf }] = await Promise.all([
      supabase.from("creators").select("*").eq("brand_id", brand.id).order("created_at", { ascending: false }),
      supabase.from("gifts").select("*").eq("brand_id", brand.id),
    ]);
    const creators = (cr as Creator[]) || [];
    const gifts = (gf as Gift[]) || [];

    const map = new Map<string, Row>();
    for (const c of creators) {
      map.set(c.instagram_handle, {
        handle: c.instagram_handle,
        id: c.id,
        name: c.name,
        email: c.email,
        notes: c.notes,
        total: 0,
        claimed: 0,
        posted: 0,
        ghosted: 0,
      });
    }
    for (const g of gifts) {
      const cur =
        map.get(g.instagram_handle) ||
        { handle: g.instagram_handle, name: null, email: null, notes: null, total: 0, claimed: 0, posted: 0, ghosted: 0 };
      cur.total++;
      if (g.status === "completed" || g.status === "shipped") cur.claimed++;
      if (g.posted === true) cur.posted++;
      if (g.posted === false) cur.ghosted++;
      map.set(g.instagram_handle, cur);
    }
    setRows([...map.values()].sort((a, b) => b.total - a.total || a.handle.localeCompare(b.handle)));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [brand]);

  async function removeCreator(row: Row) {
    if (!row.id) return;
    if (!confirm(`Rimuovere ${row.handle} dalla rubrica?\n\nI regali gia inviati restano nello storico.`)) return;
    await supabase.from("creators").delete().eq("id", row.id);
    load();
  }

  if (loading) return <Spinner />;

  const filtered = rows.filter(
    (r) =>
      r.handle.toLowerCase().includes(q.toLowerCase()) ||
      (r.name || "").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Creator</h1>
          <p className="mt-1 text-sm text-gray-500">
            La tua rubrica. Chi ricambia con un post e chi no.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setImporting(true)} disabled={!brand}>Importa CSV</Button>
          <Button onClick={() => setAdding(true)} disabled={!brand}>+ Aggiungi creator</Button>
        </div>
      </div>

      {adding && brand && (
        <CreatorForm brandId={brand.id} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); load(); }} />
      )}
      {editing && brand && (
        <CreatorForm
          brandId={brand.id}
          existing={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
      {importing && brand && (
        <ImportForm brandId={brand.id} onClose={() => setImporting(false)} onDone={() => { setImporting(false); load(); }} />
      )}

      {rows.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-gray-100 text-2xl">&#128100;</div>
          <p className="font-medium text-gray-900">Rubrica vuota</p>
          <p className="mt-1 text-sm text-gray-500">
            Aggiungi i creator a mano, importali da CSV, oppure genera un link: entreranno qui in automatico.
          </p>
        </Card>
      ) : (
        <>
          <div className="mb-4 max-w-xs">
            <Input placeholder="Cerca per handle o nome..." value={q} onChange={(e) => setQ(e.target.value)} />
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
                    <th className="px-4 py-3 text-right font-medium">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const rate = r.claimed ? Math.round((r.posted / r.claimed) * 100) : null;
                    return (
                      <tr key={r.handle} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                        <td className="px-4 py-3">
                          <Link to={`/creator/${encodeURIComponent(r.handle)}`} className="font-medium text-gray-900 hover:underline">
                            {r.handle}
                          </Link>
                          {r.name && <p className="text-xs text-gray-500">{r.name}</p>}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{r.total || <span className="text-gray-400">-</span>}</td>
                        <td className="px-4 py-3 text-gray-600">{r.claimed || <span className="text-gray-400">-</span>}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {r.posted || 0}
                          {r.ghosted > 0 && <span className="ml-1 text-xs text-red-500">({r.ghosted} no)</span>}
                        </td>
                        <td className="px-4 py-3">
                          {rate === null ? <span className="text-gray-400">-</span> : <ReliabilityBar rate={rate} />}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {r.id && (
                              <>
                                <button
                                  onClick={() => setEditing(r)}
                                  className="rounded-md px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100"
                                >
                                  Modifica
                                </button>
                                <button
                                  onClick={() => removeCreator(r)}
                                  className="rounded-md p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500"
                                  title="Rimuovi dalla rubrica"
                                >
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                                    <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6" />
                                  </svg>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <p className="mt-4 text-xs text-gray-400">
            L'affidabilita e calcolata sui regali riscattati che hai marcato come postati. Questi dati sono privati e visibili solo a te.
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
}

/* --------------------------- Aggiungi / modifica -------------------------- */
function CreatorForm({
  brandId,
  existing,
  onClose,
  onSaved,
}: {
  brandId: string;
  existing?: Row;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [handle, setHandle] = useState(existing?.handle || "");
  const [name, setName] = useState(existing?.name || "");
  const [email, setEmail] = useState(existing?.email || "");
  const [notes, setNotes] = useState(existing?.notes || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!handle.trim()) return setError("Inserisci l'handle Instagram.");
    setError(null);
    setSaving(true);
    const clean = "@" + handle.trim().replace(/^@/, "");
    const payload = { brand_id: brandId, instagram_handle: clean, name: name || null, email: email || null, notes: notes || null };

    const { error } = existing?.id
      ? await supabase.from("creators").update(payload).eq("id", existing.id)
      : await supabase.from("creators").insert(payload);

    setSaving(false);
    if (error) {
      setError(error.code === "23505" ? "Questo creator e gia in rubrica." : error.message);
    } else onSaved();
  }

  return (
    <Card className="mb-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">{existing ? "Modifica creator" : "Nuovo creator"}</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&#10005;</button>
      </div>
      <form onSubmit={save} className="mt-4 space-y-4">
        <Input label="Handle Instagram" value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@sophie.creates" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Nome (opzionale)" value={name} onChange={(e) => setName(e.target.value)} placeholder="Sophie Chen" />
          <Input label="Email (opzionale)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="sophie@email.com" />
        </div>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-gray-700">Note (opzionale)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Es. beauty, 40k follower, ottimo engagement"
            className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
        </label>
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>{saving ? "Salvataggio..." : "Salva"}</Button>
          <Button type="button" variant="ghost" onClick={onClose}>Annulla</Button>
        </div>
      </form>
    </Card>
  );
}

/* ------------------------------- Import CSV ------------------------------- */
function ImportForm({ brandId, onClose, onDone }: { brandId: string; onClose: () => void; onDone: () => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  function parse(): { instagram_handle: string; name: string | null; email: string | null }[] {
    const out: { instagram_handle: string; name: string | null; email: string | null }[] = [];
    const seen = new Set<string>();
    for (const line of text.split(/\r?\n/)) {
      const t = line.trim();
      if (!t) continue;
      const parts = t.split(/[,;\t]/).map((x) => x.trim());
      const raw = parts[0].replace(/^@/, "");
      if (!raw || /^(handle|instagram|username|creator)$/i.test(raw)) continue; // salta intestazione
      const h = "@" + raw;
      if (seen.has(h)) continue;
      seen.add(h);
      out.push({ instagram_handle: h, name: parts[1] || null, email: parts[2] || null });
    }
    return out;
  }

  async function doImport() {
    const parsed = parse();
    if (parsed.length === 0) {
      setResult("Nessun handle valido trovato.");
      return;
    }
    setBusy(true);
    const rows = parsed.map((p) => ({ ...p, brand_id: brandId }));
    const { error } = await supabase
      .from("creators")
      .upsert(rows, { onConflict: "brand_id,instagram_handle", ignoreDuplicates: true });
    setBusy(false);
    if (error) setResult("Errore: " + error.message);
    else {
      setResult(null);
      onDone();
    }
  }

  const preview = parse();

  return (
    <Card className="mb-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Importa creator</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&#10005;</button>
      </div>
      <p className="mt-1 text-sm text-gray-500">
        Incolla un handle per riga. Puoi aggiungere nome ed email separati da virgola.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={7}
        placeholder={"@sophie.creates, Sophie Chen, sophie@email.com\n@mayaruns\n@jordan.kim, Jordan Kim"}
        className="mt-4 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 font-mono text-xs outline-none focus:border-brand focus:ring-1 focus:ring-brand"
      />

      {preview.length > 0 && (
        <p className="mt-2 text-sm text-gray-600">
          {preview.length} creator pronti da importare. I duplicati verranno ignorati.
        </p>
      )}
      {result && <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{result}</div>}

      <div className="mt-4 flex gap-2">
        <Button onClick={doImport} disabled={busy || preview.length === 0}>
          {busy ? "Importazione..." : `Importa ${preview.length || ""}`}
        </Button>
        <Button variant="ghost" onClick={onClose}>Annulla</Button>
      </div>
    </Card>
  );
}
