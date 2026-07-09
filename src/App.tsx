import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import { Spinner } from "./components/ui";
import AuthPage from "./pages/AuthPage";
import DashboardLayout from "./pages/DashboardLayout";
import OverviewPage from "./pages/OverviewPage";
import DashboardHome from "./pages/DashboardHome";
import CreatorsPage from "./pages/CreatorsPage";
import CampaignView from "./pages/CampaignView";
import CreatorGiftPage from "./pages/CreatorGiftPage";

function ProtectedApp() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Spinner />
      </div>
    );
  }

  if (!session) return <AuthPage />;

  return (
    <DashboardLayout>
      <Routes>
        <Route path="/" element={<OverviewPage />} />
        <Route path="/campagne" element={<DashboardHome />} />
        <Route path="/campagna/:id" element={<CampaignView />} />
        <Route path="/creator" element={<CreatorsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </DashboardLayout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/g/:token" element={<CreatorGiftPage />} />
        <Route
          path="/*"
          element={
            <AuthProvider>
              <ProtectedApp />
            </AuthProvider>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
