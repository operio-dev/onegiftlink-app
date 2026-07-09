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
}
