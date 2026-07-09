import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import type { Gift, Campaign } from "../lib/types";
import { Card, Spinner, Badge } from "../components/ui";

export default function OverviewPage() {
  const { brand } = useAuth();
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!brand) {
        setLoading(false);
        return;
      }
      const [{ data: g }, { data: c }] = await Promise.all([
        supabase.from("gifts").select("*").eq("brand_id", brand.id).order("created_at", { ascending: false }),
        supabase.from("campaigns").select("*").eq("brand_id", brand.id),
      ]);
      setGifts((g as Gift[]) || []);
      setCampaigns((c as Campaign[]) || []);
      setLoading(false);
    }
    load();
  }, [brand]);

  if (loading) return <Spinner />;

  const sent = gifts.length;
  const claimed = gifts.filter((g) => g.status === "completed" || g.status === "shipped").length;
  const posted = gifts.filter((g) => g.posted === true).length;
  const claimRate = sent ? Math.round((claimed / sent) * 100) : 0;
  const postRate = claimed ? Math.round((posted / claimed) * 100) : 0;
  const pending = gifts.filter((g) => g.status === "sent" || g.status === "opened").length;

  const stats = [
    { label: "Link inviati", value: String(sent), sub: `${campaigns.length} campagne attive` },
    { label: "Regali riscattati", value: String(claimed), sub: `${claimRate}% di riscatto`, good: claimRate >= 60 },
    { label: "In attesa", value: String(pending), sub: "non ancora completati" },
    { label: "Hanno postato", value: String(posted), sub: `${postRate}% di chi ha ricevuto`, good: postRate >= 50 },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Panoramica</h1>
        <p className="mt-1 text-sm text-gray-500">Come stanno andando le tue campagne di seeding.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="mt-1.5 text-3xl font-semibold tracking-tight text-gray-900">{s.value}</p>
            <p className={`mt-1 text-xs ${s.good ? "text-green-600" : "text-gray-400"}`}>{s.sub}</p>
          </Card>
        ))}
      </div>

      {sent === 0 ? (
        <Card className="mt-6 p-12 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-gray-100 text-2xl">&#127873;</div>
          <p className="font-medium text-gray-900">Non hai ancora inviato regali</p>
          <p className="mt-1 text-sm text-gray-500">
            Crea una campagna e genera il tuo primo link.
          </p>
          <Link to="/campagne" className="mt-4 inline-block text-sm font-medium text-brand hover:underline">
            Vai alle campagne
          </Link>
        </Card>
      ) : (
        <Card className="mt-6 overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-900">Attivita recente</h2>
            <Link to="/campagne" className="text-xs font-medium text-brand hover:underline">
              Tutte le campagne
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {gifts.slice(0, 6).map((g) => (
              <div key={g.id} className="flex items-center justify-between px-5 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{g.instagram_handle}</p>
                  <p className="truncate text-xs text-gray-500">
                    {g.product_name || "Prodotto a scelta"}
                    {g.selected_size ? ` - taglia ${g.selected_size}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {g.posted === true && <span title="Ha postato">&#9989;</span>}
                  <StatusBadge status={g.status} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { l: string; c: "gray" | "blue" | "green" | "amber" }> = {
    sent: { l: "Inviato", c: "gray" },
    opened: { l: "Aperto", c: "amber" },
    completed: { l: "Completato", c: "blue" },
    shipped: { l: "Spedito", c: "green" },
  };
  const s = map[status] || map.sent;
  return <Badge color={s.c}>{s.l}</Badge>;
}
