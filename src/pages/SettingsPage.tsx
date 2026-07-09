import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import type { Gift, Campaign } from "../lib/types";
import { Button, Input, Card, Spinner } from "../components/ui";

const ACCENTI = ["#111111", "#2563eb", "#7c3aed", "#db2777", "#059669", "#ea580c"];

export default function SettingsPage() {
  const { brand, session, loading } = useAuth();
  if (loading) return <Spinner />;

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Impostazioni</h1>
        <p className="mt-1 text-sm text-gray-500">Configura il tuo brand, i link e il tuo account.</p>
      </div>

      <div className="space-y-6">
        <BrandSection />
        <GiftLinkSection />
        <AccountSection email={session?.user?.email || ""} />
        <DataSection brandId={brand?.id} />
      </div>
    </div>
  );
}

/* ------------------------------- Sezione 1 -------------------------------- */
function BrandSection() {
  const { session, brand, refreshBrand } = useAuth();
  const [name, setName] = useState(brand?.name || "");
  const [welcome, setWelcome] = useState(brand?.welcome_message || "");
  const [accent, setAccent] = useState(brand?.accent_color || "#111111");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.user) return;
    setMsg(null);
    setSaving(true);

    let logoUrl = brand?.logo_url || null;
    if (logoFile) {
      const ext = logoFile.name.split(".").pop();
      const path = `${session.user.id}/logo.${ext}`;
      const { error: upErr } = await supabase.storage.from("logos").upload(path, logoFile, { upsert: true });
      if (upErr) {
        setSaving(false);
        setMsg({ ok: false, text: "Errore nel caricamento del logo: " + upErr.message });
        return;
      }
      const { data } = supabase.storage.from("logos").getPublicUrl(path);
      logoUrl = `${data.publicUrl}?v=${Date.now()}`;
    }

    const { error } = await supabase.from("brands").upsert(
      {
        user_id: session.user.id,
        name,
        logo_url: logoUrl,
        welcome_message: welcome || null,
        accent_color: accent,
      },
      { onConflict: "user_id" }
    );

    setSaving(false);
    if (error) setMsg({ ok: false, text: error.message });
    else {
      await refreshBrand();
      setLogoFile(null);
      setMsg({ ok: true, text: "Impostazioni salvate." });
    }
  }

  async function removeLogo() {
    if (!session?.user || !confirm("Rimuovere il logo? La pagina del creator mostrera il nome del brand.")) return;
    await supabase.from("brands").upsert({ user_id: session.user.id, name, logo_url: null }, { onConflict: "user_id" });
    await refreshBrand();
  }

  return (
    <Card className="p-6">
      <h2 className="text-base font-semibold text-gray-900">Brand</h2>
      <p className="mt-1 text-sm text-gray-500">Quello che il creator vede quando apre il tuo link.</p>

      <form onSubmit={save} className="mt-5 space-y-5">
        <Input label="Nome del brand" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Es. Maison Noir" />

        <div>
          <span className="mb-1.5 block text-sm font-medium text-gray-700">Logo</span>
          {brand?.logo_url && !logoFile && (
            <div className="mb-3 flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <img src={brand.logo_url} alt="Logo" className="h-10 w-auto max-w-[120px] object-contain" />
              <button type="button" onClick={removeLogo} className="ml-auto text-xs font-medium text-red-500 hover:underline">
                Rimuovi
              </button>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-4 file:py-2 file:text-sm file:font-medium hover:file:bg-gray-200"
          />
          <p className="mt-1.5 text-xs text-gray-400">PNG o SVG con sfondo trasparente. Consigliato: almeno 200px di larghezza.</p>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-gray-700">Messaggio di benvenuto (opzionale)</span>
          <textarea
            value={welcome}
            onChange={(e) => setWelcome(e.target.value)}
            rows={2}
            maxLength={140}
            placeholder="Es. Grazie per il tuo supporto! Scegli il regalo che preferisci."
            className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-brand focus:ring-1 focus:ring-brand"
          />
          <span className="mt-1 block text-xs text-gray-400">{welcome.length}/140 caratteri</span>
        </label>

        <div>
          <span className="mb-2 block text-sm font-medium text-gray-700">Colore accento</span>
          <div className="flex flex-wrap gap-2">
            {ACCENTI.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setAccent(c)}
                style={{ backgroundColor: c }}
                className={`h-9 w-9 rounded-full transition-transform ${
                  accent === c ? "scale-110 ring-2 ring-gray-900 ring-offset-2" : "hover:scale-105"
                }`}
                title={c}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-400">Usato per il bottone e le selezioni nella pagina del creator.</p>
        </div>

        <Preview name={name} logo={logoFile ? URL.createObjectURL(logoFile) : brand?.logo_url} welcome={welcome} accent={accent} />

        {msg && (
          <div className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
            {msg.text}
          </div>
        )}

        <Button type="submit" disabled={saving}>{saving ? "Salvataggio..." : "Salva modifiche"}</Button>
      </form>
    </Card>
  );
}

function Preview({ name, logo, welcome, accent }: { name: string; logo?: string | null; welcome: string; accent: string }) {
  return (
    <div>
      <span className="mb-2 block text-sm font-medium text-gray-700">Anteprima pagina creator</span>
      <div className="rounded-2xl border border-gray-200 bg-gradient-to-b from-gray-50 to-gray-100 p-5">
        <div className="mx-auto max-w-[240px] rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
          <p className="text-[8px] uppercase tracking-[0.2em] text-gray-400">Un regalo da</p>
          {logo ? (
            <img src={logo} alt="" className="mx-auto mt-2 h-8 w-auto max-w-[70%] object-contain" />
          ) : (
            <p className="mt-1 text-sm font-bold text-gray-900">{name || "Il tuo brand"}</p>
          )}
          {welcome && <p className="mt-2 text-[10px] leading-snug text-gray-500">{welcome}</p>}
          <div className="mt-3 rounded-lg py-2 text-[10px] font-semibold text-white" style={{ backgroundColor: accent }}>
            Ricevi il tuo regalo
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- Sezione 2 -------------------------------- */
function GiftLinkSection() {
  const { session, brand, refreshBrand } = useAuth();
  const [expiry, setExpiry] = useState<string>(brand?.default_expiry_days ? String(brand.default_expiry_days) : "");
  const [country, setCountry] = useState(brand?.default_country || "Italia");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.user || !brand) return;
    setSaving(true);
    await supabase
      .from("brands")
      .update({
        default_expiry_days: expiry ? parseInt(expiry) : null,
        default_country: country || null,
      })
      .eq("id", brand.id);
    await refreshBrand();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <Card className="p-6">
      <h2 className="text-base font-semibold text-gray-900">Link regalo</h2>
      <p className="mt-1 text-sm text-gray-500">Comportamento predefinito dei nuovi link che generi.</p>

      <form onSubmit={save} className="mt-5 space-y-5">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-gray-700">Scadenza dei link</span>
          <select
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          >
            <option value="">Nessuna scadenza</option>
            <option value="7">7 giorni</option>
            <option value="14">14 giorni</option>
            <option value="30">30 giorni</option>
            <option value="60">60 giorni</option>
          </select>
          <span className="mt-1.5 block text-xs text-gray-400">
            Dopo la scadenza il creator vede un messaggio e non puo piu riscattare. Vale solo per i link nuovi.
          </span>
        </label>

        <Input
          label="Paese predefinito di spedizione"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          placeholder="Italia"
        />

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving || !brand}>{saving ? "Salvataggio..." : "Salva"}</Button>
          {saved && <span className="text-sm text-green-600">Salvato</span>}
        </div>
      </form>
    </Card>
  );
}

/* ------------------------------- Sezione 3 -------------------------------- */
function AccountSection({ email }: { email: string }) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (pw.length < 6) return setMsg({ ok: false, text: "La password deve avere almeno 6 caratteri." });
    if (pw !== pw2) return setMsg({ ok: false, text: "Le due password non coincidono." });
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setSaving(false);
    if (error) setMsg({ ok: false, text: error.message });
    else {
      setPw("");
      setPw2("");
      setMsg({ ok: true, text: "Password aggiornata." });
    }
  }

  async function signOutAll() {
    if (!confirm("Uscire da tutti i dispositivi? Dovrai accedere di nuovo.")) return;
    await supabase.auth.signOut({ scope: "global" });
  }

  return (
    <Card className="p-6">
      <h2 className="text-base font-semibold text-gray-900">Account</h2>

      <div className="mt-5 space-y-5">
        <div>
          <span className="mb-1.5 block text-sm font-medium text-gray-700">Email</span>
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-600">{email}</div>
        </div>

        <form onSubmit={changePassword} className="space-y-3">
          <span className="block text-sm font-medium text-gray-700">Cambia password</span>
          <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Nuova password" />
          <Input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Ripeti la nuova password" />
          {msg && (
            <div className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
              {msg.text}
            </div>
          )}
          <Button type="submit" variant="secondary" disabled={saving || !pw}>
            {saving ? "Aggiornamento..." : "Aggiorna password"}
          </Button>
        </form>

        <div className="border-t border-gray-100 pt-4">
          <button onClick={signOutAll} className="text-sm font-medium text-gray-600 hover:text-gray-900 hover:underline">
            Esci da tutti i dispositivi
          </button>
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------- Sezione 4 -------------------------------- */
function DataSection({ brandId }: { brandId?: string }) {
  const [busy, setBusy] = useState(false);

  async function exportAll() {
    if (!brandId) return;
    setBusy(true);
    const [{ data: camps }, { data: gifts }] = await Promise.all([
      supabase.from("campaigns").select("*").eq("brand_id", brandId),
      supabase.from("gifts").select("*").eq("brand_id", brandId),
    ]);
    const payload = {
      esportato_il: new Date().toISOString(),
      campagne: (camps as Campaign[]) || [],
      regali: (gifts as Gift[]) || [],
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `onegiftlink-dati-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setBusy(false);
  }

  async function deleteAll() {
    if (!brandId) return;
    const conferma = prompt('Questa azione elimina TUTTE le campagne, i link e i dati dei creator. I link inviati smetteranno di funzionare. Scrivi ELIMINA per confermare.');
    if (conferma !== "ELIMINA") return;
    setBusy(true);
    await supabase.from("brands").delete().eq("id", brandId);
    await supabase.auth.signOut();
  }

  return (
    <Card className="p-6">
      <h2 className="text-base font-semibold text-gray-900">Dati e privacy</h2>
      <p className="mt-1 text-sm text-gray-500">
        I dati dei creator sono conservati in Europa e usati solo per la spedizione.
      </p>

      <div className="mt-5 space-y-4">
        <div className="flex flex-col gap-2 rounded-lg border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Esporta tutti i dati</p>
            <p className="text-sm text-gray-500">Campagne, link e dati dei creator in formato JSON.</p>
          </div>
          <Button variant="secondary" onClick={exportAll} disabled={busy || !brandId}>Esporta</Button>
        </div>

        <div className="flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50/40 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-red-700">Elimina tutti i dati</p>
            <p className="text-sm text-red-600/80">Cancella brand, campagne e link. Non e reversibile.</p>
          </div>
          <Button variant="danger" onClick={deleteAll} disabled={busy || !brandId}>Elimina</Button>
        </div>
      </div>
    </Card>
  );
}
