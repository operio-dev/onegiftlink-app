import { useState } from "react";
import { supabase } from "../lib/supabase";
import { Button, Input, Card } from "../components/ui";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmSent, setConfirmSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      setLoading(false);
      if (error) {
        setError(error.message);
      } else {
        setConfirmSent(true);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) setError(error.message);
      // se ok, l'AuthProvider rileva la sessione e reindirizza
    }
  }

  if (confirmSent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-green-50 text-2xl">
            ✉️
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Controlla la tua email</h1>
          <p className="mt-2 text-sm text-gray-600">
            Ti abbiamo inviato un link di conferma a <strong>{email}</strong>. Clicca il link per
            attivare l'account, poi torna qui per accedere.
          </p>
          <button
            onClick={() => {
              setConfirmSent(false);
              setMode("login");
            }}
            className="mt-6 text-sm font-medium text-brand hover:underline"
          >
            Torna al login
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gray-900 text-white">
            🎁
          </div>
          <span className="text-lg font-semibold tracking-tight">OneGiftLink</span>
        </div>

        <Card className="p-8">
          <h1 className="text-xl font-semibold text-gray-900">
            {mode === "login" ? "Accedi" : "Crea il tuo account"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {mode === "login"
              ? "Bentornato. Accedi per gestire le tue campagne."
              : "Inizia a gestire il tuo seeding senza DM."}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Input
              label="Email di lavoro"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@tuobrand.com"
            />
            <Input
              label="Password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Almeno 6 caratteri"
            />

            {error && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Attendi…" : mode === "login" ? "Accedi" : "Crea account"}
            </Button>
          </form>

          <div className="mt-5 text-center text-sm text-gray-500">
            {mode === "login" ? (
              <>
                Non hai un account?{" "}
                <button
                  onClick={() => {
                    setMode("signup");
                    setError(null);
                  }}
                  className="font-medium text-brand hover:underline"
                >
                  Registrati
                </button>
              </>
            ) : (
              <>
                Hai già un account?{" "}
                <button
                  onClick={() => {
                    setMode("login");
                    setError(null);
                  }}
                  className="font-medium text-brand hover:underline"
                >
                  Accedi
                </button>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
