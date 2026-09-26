import { useSearchParams } from "react-router-dom";

import PageLoading from "../components/PageLoading";
import AdminOverview from "../components/admin/AdminOverview";
import AdminReports from "../components/admin/AdminReports";
import AdminUsers from "../components/admin/AdminUsers";
import AdminEvents from "../components/admin/AdminEvents";
import AdminWinners from "../components/admin/AdminWinners";
import AdminLog from "../components/admin/AdminLog";
import AdminAnnounce from "../components/admin/AdminAnnounce";
import { useMyProfile } from "../context/ProfileContext";
import NotFound from "./NotFound";

import "../styles/admin.css";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "reports", label: "Reports" },
  { id: "users", label: "Members" },
  { id: "events", label: "Events" },
  { id: "winners", label: "Winners" },
  { id: "log", label: "Log" },
  { id: "announce", label: "📣 Announce", ownerOnly: true },
];

function AdminPage() {
  const { isAdmin, isOwner } = useMyProfile();
  const [params, setParams] = useSearchParams();

  const tabs = TABS.filter((item) => !item.ownerOnly || isOwner);
  const tab = tabs.some((item) => item.id === params.get("tab")) ? params.get("tab") : "overview";
  const openTab = (id) => setParams(id === "overview" ? {} : { tab: id });

  if (isAdmin === null) return <PageLoading />;
  if (!isAdmin) return <NotFound />;

  return (
    <main className="page admin-page">
      <header className="page-header">
        <span className="eyebrow">Admin</span>
        <h1>
          Run <span className="mark">Suffrova.</span>
        </h1>
        <p>Reports, members, events and payouts. Everything you do here is logged.</p>
      </header>

      <div className="admin-tabs" role="tablist" aria-label="Admin sections">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={tab === item.id ? "active" : ""}
            onClick={() => openTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" className="admin-panel">
        {tab === "overview" && <AdminOverview onOpenReports={() => openTab("reports")} />}
        {tab === "reports" && <AdminReports />}
        {tab === "users" && <AdminUsers />}
        {tab === "events" && <AdminEvents />}
        {tab === "winners" && <AdminWinners />}
        {tab === "log" && <AdminLog />}
        {tab === "announce" && <AdminAnnounce />}
      </div>
    </main>
  );
}

export default AdminPage;
