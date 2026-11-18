import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../api/client';
import { Button, ErrorNote } from '../components/ui';
import { PlotlyChart } from '../components/PlotlyChart';

interface Result {
  summary: { rows: number; rowsDropped: number; totalRevenue: number; averageRevenue: number; medianRevenue: number; minRevenue: number; maxRevenue: number; regions: number; salespeople: number; topRegion: { name: string; revenue: number }; topSalesperson: string };
  charts: Record<'revenue_by_region' | 'top_salespeople', { data: unknown[]; layout?: Record<string, unknown> }>;
  png?: Record<string, string>;
  pngError?: string;
}
const money = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });

export function AnalyticsPage() {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const run = useMutation({
    mutationFn: (f: File) => { const form = new FormData(); form.append('file', f); return api<Result>('/analytics/analyze', { method: 'POST', form, query: { png: 'true' } }); },
  });
  const r = run.data;

  const download = (name: string, b64: string) => {
    const a = document.createElement('a');
    a.href = `data:image/png;base64,${b64}`;
    a.download = `${name}.png`;
    a.click();
  };

  return (
    <>
      <h1>Sales analytics</h1>
      <section className="panel">
        <p className="muted">Upload a CSV with the columns <code>salesperson,revenue,region</code>. Max 5 MB.</p>
        <div className="upload">
          <input ref={input} type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} aria-label="Sales CSV file" />
          <Button disabled={!file} loading={run.isPending} onClick={() => file && run.mutate(file)}>Analyse</Button>
        </div>
        {run.isError && <ErrorNote error={run.error} />}
      </section>

      {r && (
        <>
          <div className="kpis">
            <div className="kpi"><span>Total revenue</span><strong>{money(r.summary.totalRevenue)}</strong></div>
            <div className="kpi"><span>Average per row</span><strong>{money(r.summary.averageRevenue)}</strong></div>
            <div className="kpi"><span>Top region</span><strong>{r.summary.topRegion.name}</strong></div>
            <div className="kpi"><span>Top salesperson</span><strong>{r.summary.topSalesperson}</strong></div>
          </div>
          {r.summary.rowsDropped > 0 && <div className="note">{r.summary.rowsDropped} row(s) were skipped because revenue wasn't a number or a field was empty.</div>}
          <section className="panel"><PlotlyChart figure={r.charts.revenue_by_region} />{r.png && <Button variant="ghost" onClick={() => download('revenue-by-region', r.png!.revenue_by_region)}>Download PNG</Button>}</section>
          <section className="panel"><PlotlyChart figure={r.charts.top_salespeople} />{r.png && <Button variant="ghost" onClick={() => download('top-salespeople', r.png!.top_salespeople)}>Download PNG</Button>}</section>
          {r.pngError && <div className="note">{r.pngError}</div>}
          <section className="panel">
            <h2>Summary statistics</h2>
            <dl className="stats">
              {([['Rows analysed', r.summary.rows], ['Median', money(r.summary.medianRevenue)], ['Minimum', money(r.summary.minRevenue)], ['Maximum', money(r.summary.maxRevenue)], ['Regions', r.summary.regions], ['Salespeople', r.summary.salespeople]] as const).map(([k, v]) => (
                <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
              ))}
            </dl>
          </section>
        </>
      )}
    </>
  );
}
