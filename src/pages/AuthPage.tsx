import { useState } from "react";
import { supabase } from "../lib/supabase";
import { Button, Input, Card } from "../components/ui";

const SITO_URL = "https://onegiftlink.filippo1tafuri.workers.dev/#beta";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("Email o password non corretti. Se non hai ancora un account, richiedi l'accesso alla beta.");
    }
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
          <h1 className="text-xl font-semibold text-gray-900">Accedi</h1>
          <p className="mt-1 text-sm text-gray-500">
            Bentornato. Accedi per gestire le tue campagne.
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="La tua password"
            />

            {error && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Attendi…" : "Accedi"}
            </Button>
          </form>

          <div className="mt-6 border-t border-gray-100 pt-5 text-center">
            <p className="text-sm text-gray-500">
              Non hai ancora un account?
            </p>
            <p className="mt-1 text-sm text-gray-500">
              L'accesso è riservato ai brand della beta.{" "}
              <a
                href={SITO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-brand hover:underline"
              >
                Richiedi l'attivazione di prova
              </a>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
