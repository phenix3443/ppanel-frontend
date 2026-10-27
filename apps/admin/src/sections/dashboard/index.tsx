import Billing from "./components/billing";
import HealthStrip from "./components/health-strip";
import HomeHeader from "./components/home-header";
import MetricBand from "./components/metric-band";
import StatisticsCard from "./components/statistics-card";
import TrafficRankCard from "./components/traffic-rank-card";

// Board-approved layout B (ops first): header → running status → metrics →
// statistics/ranking → sponsors. See docs/plans/admin-home-b.md.
export default function Dashboard() {
  return (
    <div className="admin-home @container/home" data-admin-home>
      <div className="flex flex-col gap-4">
        <HomeHeader />
        <HealthStrip />
        <MetricBand />
        <div className="grid @5xl/home:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)] grid-cols-1 gap-4">
          <StatisticsCard />
          <TrafficRankCard />
        </div>
        <Billing type="dashboard" />
      </div>
    </div>
  );
}
