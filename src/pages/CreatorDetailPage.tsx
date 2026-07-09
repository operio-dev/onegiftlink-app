import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import type { Gift, Creator, Content } from "../lib/types";
import { Card, Spinner, Badge, Button } from "../components/ui";
import AddContentModal from "../components/AddContentModal";

const LABEL: Record<string, { l: string; c: "gray" | "blue" | "green" | "amber" }> = {
  sent: { l: "Inviato", c: "gray" },
  opened: { l: "Aperto", c: "amber" },
  completed: { l: "Completato", c: "blue" },
  shipped: { l: "Spedito", c: "green" },
};

export default function CreatorDetailPage() {
  const { handle } = useParams<{ handle: string }>();
  const { brand } = useAuth();
  const decoded = decodeURIComponent(handle || "");
  const [creator, setCreator] = useState<Creator | null>(null);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [contents, setContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [addContent, setAddContent] = useState(false);

  async function load() {
    if (!brand) return setLoading(false);
    const [{ data: cr }, { data: gf }, { data: ct }] = await Promise.all([
      supabase.from("creators").select("*").eq("brand_id", brand.id).eq("instagram_handle", decoded).maybeSingle(),
      supabase.from("gifts").select("*").eq("brand_id", brand.id).eq("instagram_handle", decoded).order("created_at", { ascending: false }),
      supabase.from("contents").select("*").eq("brand_id", brand.id).eq("creator_handle", decoded).order("created_at", { ascending: false }),
    ]);
    const c = cr as Creator | null;
    setCreator(c);
    setNotes(c?.notes || "");
    setGifts((gf as Gift[]) || []);
    setContents((ct as Content[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [brand, decoded]);

  async function saveNotes() {
    if (!creator) return;
    setSavingNotes(true);
    await supabase.from("creators").update({ notes: notes || null }).eq("id", creator.id);
    setSavingNotes(false);
  }

  if (loading) return <Spinner />;

  const claimed = gifts.filter((g) => g.status === "completed" || g.status === "shipped").length;
  const posted = gifts.filter((g) => g.posted === true).length;
  const ghosted = gifts.filter((g) => g.posted === false).length;
  const rate = claimed ? Math.round((posted / claimed) * 100) : null;

  return (
    <div>
      <Link to="/creator" className="mb-4 inline-block text-sm text-gray-500 hover:text-gray-800">&larr; Creator</Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{decoded}</h1>
          {creator?.name && <p className="mt-1 text-sm text-gray-500">{creator.name}</p>}
          {creator?.email && <p className="text-sm text-gray-400">{creator.email}</p>}
        </div>
        <div className="flex gap-2">
          <a
            href={`https://instagram.com/${decoded.replace(/^@/, "")}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="secondary">Apri profilo</Button>
          </a>
          {brand && <Button onClick={() => setAddContent(true)}>+ Contenuto</Button>}
        </div>
      </div>

      {addContent && brand && (
        <AddContentModal
          brandId={brand.id}
          creatorHandle={decoded}
          onClose={() => setAddContent(false)}
          onSaved={() => {
            setAddContent(false);
            load();
          }}
        />
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-5"><p className="text-sm text-gray-500">Regali ricevuti</p><p className="mt-1 text-2xl font-semibold">{gifts.length}</p></Card>
        <Card className="p-5"><p className="text-sm text-gray-500">Riscattati</p><p className="mt-1 text-2xl font-semibold">{claimed}</p></Card>
        <Card className="p-5"><p className="text-sm text-gray-500">Ha postato</p><p className="mt-1 text-2xl font-semibold">{posted}</p></Card>
        <Card className="p-5">
          <p className="text-sm text-gray-500">Affidabilita</p>
          <p className="mt-1 text-2xl font-semibold">{rate === null ? "-" : `${rate}%`}</p>
          {ghosted > 0 && <p className="mt-0.5 text-xs text-red-500">{ghosted} senza post</p>}
        </Card>
      </div>

      {creator && (
        <Card className="mb-6 p-6">
          <h2 className="text-base font-semibold text-gray-900">Note interne</h2>
          <p className="mt-1 text-sm text-gray-500">Visibili solo a te. Utili per personalizzare i messaggi.</p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Es. Pelle sensibile, preferisce toni caldi, non ama i profumi intensi"
            className="mt-3 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
          <div className="mt-3">
            <Button variant="secondary" onClick={saveNotes} disabled={savingNotes}>
              {savingNotes ? "Salvataggio..." : "Salva note"}
            </Button>
          </div>
        </Card>
      )}

      <Card className="mb-6 overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Storico regali</h2>
        </div>
        {gifts.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">Nessun regalo inviato.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {gifts.map((g) => (
              <div key={g.id} className="flex items-center justify-between px-5 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {g.product_name || "Prodotto a scelta"}
                    {g.selected_color && <span className="text-gray-400"> - {g.selected_color}</span>}
                    {g.selected_size && <span className="text-gray-400"> - {g.selected_size}</span>}
                  </p>
                  <p className="text-xs text-gray-400">{new Date(g.created_at).toLocaleDateString("it-IT")}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span title={g.posted === true ? "Ha postato" : g.posted === false ? "Non ha postato" : "In attesa"}>
                    {g.posted === true ? "\u2705" : g.posted === false ? "\u274C" : "\u23F3"}
                  </span>
                  <Badge color={LABEL[g.status].c}>{LABEL[g.status].l}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {contents.length > 0 && (
        <Card className="overflow-hidden">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-900">Contenuti pubblicati</h2>
          </div>
          <div className="grid gap-4 p-5 sm:grid-cols-3">
            {contents.map((c) => (
              <div key={c.id} className="overflow-hidden rounded-lg border border-gray-200">
                <div className="aspect-[4/5] bg-gray-100">
                  {c.image_url ? (
                    <img src={c.image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-3xl text-gray-300">&#128279;</div>
                  )}
                </div>
                <div className="p-2">
                  {c.post_url && (
                    <a href={c.post_url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-brand hover:underline">
                      Apri post
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
