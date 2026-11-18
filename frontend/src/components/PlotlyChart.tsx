import { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-basic-dist-min';

export function PlotlyChart({ figure }: { figure: { data: unknown[]; layout?: Record<string, unknown> } }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    Plotly.newPlot(el, figure.data, { ...figure.layout, autosize: true, width: undefined, height: 380 }, { responsive: true, displaylogo: false });
    return () => Plotly.purge(el);
  }, [figure]);
  return <div ref={ref} className="chart" />;
}
