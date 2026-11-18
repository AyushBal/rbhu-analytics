import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../api/client';
import { NEXT_STATUSES, SHIPMENT_STATUSES, STATUS_LABEL, type Customer, type Paged, type Shipment, type ShipmentStatus } from '../api/types';
import { Button, Empty, ErrorNote, Field, Input, Modal, Pagination, Spinner, StatusBadge, formErrorMessage } from '../components/ui';
import { useDebounce } from '../hooks/useDebounce';
import { useToast } from '../context/ToastContext';

const schema = z.object({
  customerId: z.string().min(1, 'Choose a customer'),
  origin: z.string().trim().min(1, 'Origin is required').max(160),
  destination: z.string().trim().min(1, 'Destination is required').max(160),
  trackingNumber: z.string().trim().regex(/^([A-Za-z0-9-]{6,32})?$/, '6–32 letters, digits or hyphens').optional(),
});
type Form = z.infer<typeof schema>;

function CreateShipment({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const customers = useQuery({ queryKey: ['customers', 'options'], queryFn: () => api<Paged<Customer>>('/customers', { query: { pageSize: 100, status: 'Active' } }) });
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) });
  const create = useMutation({
    mutationFn: (v: Form) => api<Shipment>('/shipments', { method: 'POST', body: { ...v, trackingNumber: v.trackingNumber || undefined } }),
    onSuccess: (s) => { qc.invalidateQueries({ queryKey: ['shipments'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); toast(`Shipment ${s.trackingNumber} created`, 'success'); onClose(); },
  });
  return (
    <Modal title="Create shipment" onClose={onClose}>
      <form className="form" noValidate onSubmit={handleSubmit((v) => create.mutate(v))}>
        <Field label="Customer" error={errors.customerId}>
          <select className="input" {...register('customerId')} defaultValue="">
            <option value="" disabled>{customers.isLoading ? 'Loading…' : 'Select a customer'}</option>
            {customers.data?.items.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.company}</option>)}
          </select>
        </Field>
        <Input label="Origin" reg={register('origin')} error={errors.origin} />
        <Input label="Destination" reg={register('destination')} error={errors.destination} />
        <Input label="Tracking number (optional)" placeholder="Generated if left blank" reg={register('trackingNumber')} error={errors.trackingNumber} />
        {create.isError && <div className="note note-error" role="alert">{formErrorMessage(create.error)}</div>}
        <div className="actions"><Button variant="ghost" type="button" onClick={onClose}>Cancel</Button><Button type="submit" loading={create.isPending}>Create shipment</Button></div>
      </form>
    </Modal>
  );
}

function StatusSelect({ shipment }: { shipment: Shipment }) {
  const qc = useQueryClient();
  const toast = useToast();
  const next = NEXT_STATUSES[shipment.status];
  const m = useMutation({
    mutationFn: (status: ShipmentStatus) => api<Shipment>(`/shipments/${shipment.id}/status`, { method: 'PATCH', body: { status } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['shipments'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); },
    onError: (e) => toast(formErrorMessage(e), 'error'),
  });
  if (next.length === 0) return <span className="muted">Final</span>;
  return (
    <select className="input input-sm" value="" disabled={m.isPending} aria-label={`Update status of ${shipment.trackingNumber}`} onChange={(e) => e.target.value && m.mutate(e.target.value as ShipmentStatus)}>
      <option value="">Update…</option>
      {next.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
    </select>
  );
}

export function ShipmentsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [creating, setCreating] = useState(false);
  const q = useDebounce(search);
  const list = useQuery({
    queryKey: ['shipments', page, q, status],
    queryFn: () => api<Paged<Shipment>>('/shipments', { query: { page, pageSize: 10, search: q, status } }),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <div className="page-head"><h1>Shipments</h1><Button onClick={() => setCreating(true)}>Create shipment</Button></div>
      <div className="filters">
        <input className="input" placeholder="Search tracking number or city" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} aria-label="Search shipments" />
        <select className="input" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Filter by status">
          <option value="">All statuses</option>
          {SHIPMENT_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
      </div>
      {list.isLoading && <Spinner />}
      {list.isError && <ErrorNote error={list.error} onRetry={() => list.refetch()} />}
      {list.data && (list.data.items.length === 0 ? <Empty title="No shipments found" hint="Create a shipment or change the filters." /> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Tracking</th><th>Customer</th><th>Route</th><th>Status</th><th>Update</th></tr></thead>
            <tbody>
              {list.data.items.map((s) => (
                <tr key={s.id}>
                  <td data-label="Tracking"><code>{s.trackingNumber}</code></td>
                  <td data-label="Customer">{s.customer.name}<br /><small className="muted">{s.customer.company}</small></td>
                  <td data-label="Route">{s.origin} → {s.destination}</td>
                  <td data-label="Status"><StatusBadge status={s.status} /></td>
                  <td data-label="Update"><StatusSelect shipment={s} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={list.data.page} totalPages={list.data.totalPages} total={list.data.total} onChange={setPage} />
        </div>
      ))}
      {creating && <CreateShipment onClose={() => setCreating(false)} />}
    </>
  );
}
