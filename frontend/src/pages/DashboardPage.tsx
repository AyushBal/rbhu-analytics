import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { STATUS_LABEL, type Announcement, type DashboardStats } from '../api/types';
import { ErrorNote, Spinner } from '../components/ui';

export function DashboardPage() {
  const stats = useQuery({ queryKey: ['dashboard'], queryFn: () => api<DashboardStats>('/dashboard/stats') });
  const news = useQuery({ queryKey: ['announcements'], queryFn: () => api<{ items: Announcement[] }>('/announcements') });

  if (stats.isLoading) return <Spinner />;
  if (stats.isError) return <ErrorNote error={stats.error} onRetry={() => stats.refetch()} />;
  const d = stats.data!;
  const max = Math.max(1, ...d.statusDistribution.map((s) => s.count));

  return (
    <>
      <h1>Dashboard</h1>
      <div className="kpis">
        <div className="kpi"><span>Total customers</span><strong>{d.totalCustomers}</strong></div>
        <div className="kpi"><span>Total shipments</span><strong>{d.totalShipments}</strong></div>
      </div>

      <section className="panel">
        <h2>Shipment status distribution</h2>
        <ul className="bars">
          {d.statusDistribution.map((s) => (
            <li key={s.status}>
              <span className="bars-label">{STATUS_LABEL[s.status]}</span>
              <span className="bars-track"><span className={`bars-fill fill-${s.status}`} style={{ width: `${(s.count / max) * 100}%` }} /></span>
              <span className="bars-n">{s.count}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2>Intranet announcements</h2>
        {news.isLoading && <Spinner />}
        {news.isError && <ErrorNote error={news.error} />}
        <ul className="news">
          {news.data?.items.map((a) => (
            <li key={a.id}>
              <strong>{a.title}{a.pinned && <span className="pin"> · pinned</span>}</strong>
              <p>{a.body}</p>
              <small>{a.author} · {new Date(a.publishedAt).toLocaleDateString()}</small>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
