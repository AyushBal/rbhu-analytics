import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { tokenStore } from '../api/client';
import { useToast } from '../context/ToastContext';
import { STATUS_LABEL, type ShipmentStatus } from '../api/types';

interface Evt { event: string; shipmentId?: string; trackingNumber?: string; status?: ShipmentStatus; previousStatus?: ShipmentStatus }

/** Keeps one WebSocket open while signed in; reconnects with exponential backoff; refreshes cached data on events. */
export function useShipmentEvents(enabled: boolean) {
  const qc = useQueryClient();
  const toast = useToast();
  const retry = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    let ws: WebSocket | undefined;
    let timer: number | undefined;
    let closed = false;

    const connect = () => {
      const token = tokenStore.get();
      if (!token) return;
      const base = (import.meta.env.VITE_API_URL as string | undefined) || window.location.origin;
      const url = base.replace(/^http/, 'ws') + `/ws?token=${encodeURIComponent(token)}`;
      ws = new WebSocket(url);
      ws.onopen = () => { retry.current = 0; };
      ws.onmessage = (m) => {
        let evt: Evt;
        try { evt = JSON.parse(m.data); } catch { return; }
        if (evt.event !== 'shipment_status_changed') return;
        const label = evt.status ? STATUS_LABEL[evt.status] : 'updated';
        toast(`Shipment ${evt.trackingNumber ?? evt.shipmentId} is now ${label.toLowerCase()}`, 'info');
        qc.invalidateQueries({ queryKey: ['shipments'] });
        qc.invalidateQueries({ queryKey: ['dashboard'] });
      };
      ws.onclose = () => {
        if (closed) return;
        const delay = Math.min(30_000, 1000 * 2 ** retry.current++);
        timer = window.setTimeout(connect, delay);
      };
    };
    connect();
    return () => { closed = true; window.clearTimeout(timer); ws?.close(); };
  }, [enabled, qc, toast]);
}
