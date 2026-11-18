import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../api/client';
import type { Customer, Paged } from '../api/types';
import { Button, Empty, ErrorNote, Field, Input, Modal, Pagination, Spinner, StatusBadge, formErrorMessage } from '../components/ui';
import { useDebounce } from '../hooks/useDebounce';
import { useToast } from '../context/ToastContext';

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  email: z.string().trim().email('Enter a valid email address'),
  company: z.string().trim().min(1, 'Company is required').max(160),
  status: z.enum(['Active', 'Inactive']),
});
type Form = z.infer<typeof schema>;

function CustomerForm({ customer, onClose }: { customer?: Customer; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: customer ? { name: customer.name, email: customer.email, company: customer.company, status: customer.status } : { status: 'Active' },
  });
  const save = useMutation({
    mutationFn: (v: Form) => customer ? api<Customer>(`/customers/${customer.id}`, { method: 'PUT', body: v }) : api<Customer>('/customers', { method: 'POST', body: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); toast(customer ? 'Customer updated' : 'Customer added', 'success'); onClose(); },
  });
  return (
    <Modal title={customer ? 'Edit customer' : 'Add customer'} onClose={onClose}>
      <form onSubmit={handleSubmit((v) => save.mutate(v))} noValidate className="form">
        <Input label="Name" reg={register('name')} error={errors.name} />
        <Input label="Email" type="email" reg={register('email')} error={errors.email} />
        <Input label="Company" reg={register('company')} error={errors.company} />
        <Field label="Status"><select className="input" {...register('status')}><option>Active</option><option>Inactive</option></select></Field>
        {save.isError && <div className="note note-error" role="alert">{formErrorMessage(save.error)}</div>}
        <div className="actions"><Button variant="ghost" type="button" onClick={onClose}>Cancel</Button><Button type="submit" loading={save.isPending}>{customer ? 'Save changes' : 'Add customer'}</Button></div>
      </form>
    </Modal>
  );
}

export function CustomersPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [editing, setEditing] = useState<Customer | 'new' | null>(null);
  const q = useDebounce(search);

  const list = useQuery({
    queryKey: ['customers', page, q, status],
    queryFn: () => api<Paged<Customer>>('/customers', { query: { page, pageSize: 10, search: q, status } }),
    placeholderData: keepPreviousData,
  });
  const del = useMutation({
    mutationFn: (id: string) => api(`/customers/${id}`, { method: 'DELETE' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); toast('Customer deleted', 'success'); },
    onError: (e) => toast(formErrorMessage(e), 'error'),
  });

  return (
    <>
      <div className="page-head"><h1>Customers</h1><Button onClick={() => setEditing('new')}>Add customer</Button></div>
      <div className="filters">
        <input className="input" placeholder="Search name, email or company" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} aria-label="Search customers" />
        <select className="input" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Filter by status">
          <option value="">All statuses</option><option>Active</option><option>Inactive</option>
        </select>
      </div>

      {list.isLoading && <Spinner />}
      {list.isError && <ErrorNote error={list.error} onRetry={() => list.refetch()} />}
      {list.data && (list.data.items.length === 0 ? <Empty title="No customers found" hint="Add a customer or change the filters." /> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Company</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {list.data.items.map((c) => (
                <tr key={c.id}>
                  <td data-label="Name">{c.name}</td><td data-label="Email">{c.email}</td><td data-label="Company">{c.company}</td>
                  <td data-label="Status"><StatusBadge status={c.status} /></td>
                  <td className="row-actions">
                    <Button variant="ghost" onClick={() => setEditing(c)}>Edit</Button>
                    <Button variant="danger" loading={del.isPending && del.variables === c.id} onClick={() => window.confirm(`Delete ${c.name}? They will be hidden from lists.`) && del.mutate(c.id)}>Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={list.data.page} totalPages={list.data.totalPages} total={list.data.total} onChange={setPage} />
        </div>
      ))}
      {editing && <CustomerForm customer={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </>
  );
}
