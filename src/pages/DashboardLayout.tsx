import { useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { Button, Input, Card } from "../components/ui";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { brand } = useAuth();
  const needsSetup = !brand || !brand.name || !brand.logo_url;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            {brand?.logo_url ? (
              <img src={brand.logo_url} alt={brand.name} className="h-20 w-auto max-w-[160px] object-contain" />
            ) : (
              <>
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-gray-900 text-white">
                  🎁
                </div>
                <span className="text-[15px] font-semibold tracking-tight">OneGiftLink</span>
              </>
            )}
          </div>
          <Button variant="ghost" onClick={() => supabase.auth.signOut()}>
            Esci
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {needsSetup && <SetupBanner />}
        {children}
      </main>
    </div>
  );
}

function SetupBanner() {
  const { session, brand, refreshBrand } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(brand?.name || "");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.user) return;
    setError(null);
    setSaving(true);

    let logoUrl = brand?.logo_url || null;

    // Upload logo su Supabase Storage (bucket 'logos')
    if (logoFile) {
      const ext = logoFile.name.split(".").pop();
      const path = `${session.user.id}/logo.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("logos")
        .upload(path, logoFile, { upsert: true });
      if (upErr) {
        setSaving(false);
        setError("Errore nel caricamento del logo: " + upErr.message);
        return;
      }
      const { data } = supabase.storage.from("logos").getPublicUrl(path);
      logoUrl = data.publicUrl;
    }

    // Crea o aggiorna il record brand
    const { error: dbErr } = await supabase.from("brands").upsert(
      {
        user_id: session.user.id,
        name,
        logo_url: logoUrl,
      },
      { onConflict: "user_id" }
    );

    setSaving(false);
    if (dbErr) {
      setError(dbErr.message);
    } else {
      await refreshBrand();
      setOpen(false);
    }
  }

  if (!open) {
    return (
      <Card className="mb-6 flex flex-col items-start gap-3 border-brand/20 bg-brand/[0.03] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand">
            ✨
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Personalizza il tuo link regalo</p>
            <p className="text-sm text-gray-600">
              Aggiungi logo e nome del brand: è ciò che i creator vedranno quando apriranno il link.
            </p>
          </div>
        </div>
        <Button onClick={() => setOpen(true)}>Completa il setup</Button>
      </Card>
    );
  }

  return (
    <Card className="mb-6 p-6">
      <h2 className="text-base font-semibold text-gray-900">Setup del brand</h2>
      <form onSubmit={handleSave} className="mt-4 space-y-4">
        <Input
          label="Nome del brand"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Es. Maison Noir"
        />
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-gray-700">Logo</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-4 file:py-2 file:text-sm file:font-medium hover:file:bg-gray-200"
          />
          {brand?.logo_url && !logoFile && (
            <span className="mt-2 block text-xs text-gray-500">
              Logo attuale caricato. Scegli un file solo per sostituirlo.
            </span>
          )}
        </label>

        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Salvataggio…" : "Salva"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Annulla
          </Button>
        </div>
      </form>
    </Card>
  );
}
