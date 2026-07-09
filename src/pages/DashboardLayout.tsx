import type { ReactNode } from "react";
import { NavLink, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { Button, Card } from "../components/ui";

const IconOverview = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
);
const IconCampaigns = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
    <path d="M20 12v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8" />
    <rect x="2" y="7" width="20" height="5" rx="1" />
    <path d="M12 21V7" />
  </svg>
);
const IconCreators = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
  </svg>
);

const IconSettings = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </svg>
);

const IconContent = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="m21 15-5-5L5 21" />
  </svg>
);

const NAV = [
  { to: "/", label: "Panoramica", icon: IconOverview, end: true },
  { to: "/campagne", label: "Campagne", icon: IconCampaigns, end: false },
  { to: "/creator", label: "Creator", icon: IconCreators, end: false },
  { to: "/contenuti", label: "Contenuti", icon: IconContent, end: false },
  { to: "/impostazioni", label: "Impostazioni", icon: IconSettings, end: false },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { brand } = useAuth();
  const needsSetup = !brand || !brand.name || !brand.logo_url;

  return (
    <div className="min-h-screen bg-gray-50">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-gray-200 bg-white md:flex">
        <div className="flex h-[72px] items-center px-6">
          {brand?.logo_url ? (
            <img src={brand.logo_url} alt={brand.name} className="h-9 w-auto max-w-[150px] object-contain" />
          ) : (
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-gray-900 text-white">&#127873;</div>
              <span className="text-[15px] font-semibold tracking-tight">OneGiftLink</span>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`
              }
            >
              <item.icon />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-gray-100 p-3">
          <button
            onClick={() => supabase.auth.signOut()}
            className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
          >
            Esci
          </button>
        </div>
      </aside>

      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          {brand?.logo_url ? (
            <img src={brand.logo_url} alt={brand.name} className="h-8 w-auto max-w-[130px] object-contain" />
          ) : (
            <span className="text-[15px] font-semibold">OneGiftLink</span>
          )}
          <button onClick={() => supabase.auth.signOut()} className="text-sm text-gray-500">
            Esci
          </button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ${
                  isActive ? "bg-gray-900 text-white" : "text-gray-600"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <main className="md:pl-60">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
          {needsSetup && <SetupBanner />}
          {children}
        </div>
      </main>
    </div>
  );
}

function SetupBanner() {
  return (
    <Card className="mb-6 flex flex-col items-start gap-3 border-blue-200 bg-blue-50/50 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-100 text-blue-600">&#10024;</div>
        <div>
          <p className="text-sm font-semibold text-gray-900">Personalizza il tuo link regalo</p>
          <p className="text-sm text-gray-600">
            Aggiungi logo e nome del brand: e cio che i creator vedranno aprendo il link.
          </p>
        </div>
      </div>
      <Link to="/impostazioni">
        <Button>Completa il setup</Button>
      </Link>
    </Card>
  );
}
