import { useState } from "react";
import { supabase } from "../lib/supabase";
import { Button, Input, Card } from "./ui";

export default function AddContentModal({
  brandId,
  creatorHandle,
  giftId,
  onClose,
  onSaved,
}: {
  brandId: string;
  creatorHandle: string;
  giftId?: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [platform, setPlatform] = useState("instagram");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [rights, setRights] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!url && !file) return setError("Inserisci il link del post oppure carica uno screenshot.");
    setError(null);
    setSaving(true);

    let imageUrl: string | null = null;
    if (file) {
      const ext = file.name.split(".").pop();
      const path = `${brandId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("contents").upload(path, file);
      if (upErr) {
        setSaving(false);
        return setError("Errore nel caricamento: " + upErr.message);
      }
      imageUrl = supabase.storage.from("contents").getPublicUrl(path).data.publicUrl;
    }

    const { error: dbErr } = await supabase.from("contents").insert({
      brand_id: brandId,
      gift_id: giftId || null,
      creator_handle: creatorHandle,
      platform,
      post_url: url || null,
      image_url: imageUrl,
      rights_granted: rights,
      notes: notes || null,
    });

    setSaving(false);
    if (dbErr) setError(dbErr.message);
    else onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-10">
      <Card className="w-full max-w-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Aggiungi contenuto</h2>
            <p className="text-sm text-gray-500">Pubblicato da {creatorHandle}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&#10005;</button>
        </div>

        <form onSubmit={save} className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">Piattaforma</span>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            >
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
              <option value="altro">Altro</option>
            </select>
          </label>

          <Input
            label="Link del post (opzionale)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://instagram.com/p/..."
          />

          <div>
            <span className="mb-1.5 block text-sm font-medium text-gray-700">Screenshot o immagine</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-4 file:py-2 file:text-sm file:font-medium hover:file:bg-gray-200"
            />
            <p className="mt-1.5 text-xs text-gray-400">
              Utile per le Storie: spariscono dopo 24 ore.
            </p>
          </div>

          <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-3">
            <input
              type="checkbox"
              checked={rights}
              onChange={(e) => setRights(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">
              Il creator ha autorizzato il riutilizzo del contenuto
              <span className="mt-0.5 block text-xs text-gray-400">
                Senza autorizzazione esplicita non puoi usarlo nelle tue Ads.
              </span>
            </span>
          </label>

          <Input label="Note (opzionale)" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Es. Reel, 12k visualizzazioni" />

          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>{saving ? "Salvataggio..." : "Salva contenuto"}</Button>
            <Button type="button" variant="ghost" onClick={onClose}>Annulla</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
