import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import type { Content, Creator } from "../lib/types";
import { Card, Spinner, Button, Input, Badge } from "../components/ui";
import AddContentModal from "../components/AddContentModal";

export default function ContentLibrary() {
  const { brand } = useAuth();
  const [contents, setContents] = useState<Content[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  async function load() {
    if (!brand) return setLoading(false);
    const [{ data: c }, { data: cr }] = await Promise.all([
      supabase.from("contents").select("*").eq("brand_id", brand.id).order("created_at", { ascending: false }),
      supabase.from("creators").select("*").eq("brand_id", brand.id).order("instagram_handle"),
    ]);
    setContents((c as Content[]) || []);
    setCreators((cr as Creator[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [brand]);

  async function remove(c: Content) {
    if (!confirm("Eliminare questo contenuto dalla galleria?")) return;
    await supabase.from("contents").delete().eq("id", c.id);
    load();
  }

  if (loading) return <Spinner />;

  const filtered = contents.filter((c) => c.creator_handle.toLowerCase().includes(q.toLowerCase()));
  const withRights = contents.filter((c) => c.rights_granted).length;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Contenuti</h1>
          <p className="mt-1 text-sm text-gray-500">
            Tutto quello che i creator hanno pubblicato con i tuoi prodotti.
          </p>
        </div>
        <Button onClick={() => setPicking(true)} disabled={!brand}>+ Aggiungi contenuto</Button>
      </div>

      {picking && (
        <Card className="mb-6 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Da quale creator?</h2>
            <button onClick={() => setPicking(false)} className="text-gray-400 hover:text-gray-600">&#10005;</button>
          </div>
          {creators.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">La rubrica e vuota. Aggiungi prima un creator.</p>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              {creators.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setPicking(false);
                    setAdding(c.instagram_handle);
                  }}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:border-gray-400"
                >
                  {c.instagram_handle}
                </button>
              ))}
            </div>
          )}
        </Card>
      )}

      {adding && brand && (
        <AddContentModal
          brandId={brand.id}
          creatorHandle={adding}
          onClose={() => setAdding(null)}
          onSaved={() => {
            setAdding(null);
            load();
          }}
        />
      )}

      {contents.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-gray-100 text-2xl">&#128247;</div>
          <p className="font-medium text-gray-900">Nessun contenuto ancora</p>
          <p className="mt-1 text-sm text-gray-500">
            Quando marchi un creator come "ha postato", puoi salvare qui il suo contenuto.
          </p>
        </Card>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="max-w-xs flex-1">
              <Input placeholder="Cerca per creator..." value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <span className="text-sm text-gray-500">
              {contents.length} contenuti - {withRights} riutilizzabili
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <Card key={c.id} className="group overflow-hidden">
                <div className="relative aspect-[4/5] bg-gray-100">
                  {c.image_url ? (
                    <img src={c.image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-4xl text-gray-300">&#128279;</div>
                  )}
                  <button
                    onClick={() => remove(c)}
                    className="absolute right-2 top-2 rounded-lg bg-white/90 p-1.5 text-gray-400 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                    title="Elimina"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                      <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6" />
                    </svg>
                  </button>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-gray-900">{c.creator_handle}</p>
                    {c.rights_granted ? (
                      <Badge color="green">Riutilizzabile</Badge>
                    ) : (
                      <Badge color="amber">Solo visione</Badge>
                    )}
                  </div>
                  {c.notes && <p className="mt-1 truncate text-xs text-gray-500">{c.notes}</p>}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs capitalize text-gray-400">
                      {c.platform} - {new Date(c.created_at).toLocaleDateString("it-IT")}
                    </span>
                    {c.post_url && (
                      <a
                        href={c.post_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-brand hover:underline"
                      >
                        Apri post
                      </a>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
