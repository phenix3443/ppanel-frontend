import Billing from "./components/billing";
import HomeHeader from "./components/home-header";
import KpiGrid from "./components/kpi-grid";
import RevenueCard from "./components/revenue-card";
import TrafficRankCard from "./components/traffic-rank-card";
import UserCard from "./components/user-card";

// Board-selected layout A: header → six KPI cards → revenue | users →
// node traffic | user traffic → sponsors. See docs/plans/admin-home-a.md.
export default function Dashboard() {
  return (
    <div className="admin-home @container/home" data-admin-home>
      <div className="flex flex-col gap-4">
        <HomeHeader />
        <KpiGrid />
        <div className="grid @5xl/home:grid-cols-2 grid-cols-1 gap-4">
          <RevenueCard />
          <UserCard />
        </div>
        <div className="grid @5xl/home:grid-cols-2 grid-cols-1 gap-4">
          <TrafficRankCard target="nodes" />
          <TrafficRankCard target="users" />
        </div>
        <Billing type="dashboard" />
      </div>
    </div>
  );
}
