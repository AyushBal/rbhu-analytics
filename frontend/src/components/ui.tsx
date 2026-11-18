import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import type { FieldError, UseFormRegisterReturn } from 'react-hook-form';
import { STATUS_LABEL, type CustomerStatus, type ShipmentStatus } from '../api/types';
import { ApiError } from '../api/client';

export function Button({ variant = 'primary', loading, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger'; loading?: boolean }) {
  return (
    <button {...rest} disabled={rest.disabled || loading} className={`btn btn-${variant} ${rest.className ?? ''}`}>
      {loading ? 'Working…' : children}
    </button>
  );
}

export function StatusBadge({ status }: { status: ShipmentStatus | CustomerStatus }) {
  const label = status in STATUS_LABEL ? STATUS_LABEL[status as ShipmentStatus] : status;
  return <span className={`badge badge-${status}`}>{label}</span>;
}

export function Field({ label, error, children }: { label: string; error?: FieldError | string; children: ReactNode }) {
  const msg = typeof error === 'string' ? error : error?.message;
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {msg && <span className="field-error" role="alert">{msg}</span>}
    </label>
  );
}

export function Input({ label, error, reg, ...rest }: { label: string; error?: FieldError; reg: UseFormRegisterReturn } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Field label={label} error={error}>
      <input className="input" aria-invalid={!!error} {...reg} {...rest} />
    </Field>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('input,select,button')?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); prev?.focus(); };
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <div className="modal-head"><h2>{title}</h2><button className="icon-btn" onClick={onClose} aria-label="Close">×</button></div>
        {children}
      </div>
    </div>
  );
}

export function Pagination({ page, totalPages, total, onChange }: { page: number; totalPages: number; total: number; onChange: (p: number) => void }) {
  return (
    <div className="pager">
      <span>{total} total</span>
      <div>
        <Button variant="ghost" disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</Button>
        <span className="pager-page">Page {page} of {totalPages}</span>
        <Button variant="ghost" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Next</Button>
      </div>
    </div>
  );
}

export function ErrorNote({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const msg = error instanceof ApiError ? error.message : 'Something went wrong.';
  return (
    <div className="note note-error" role="alert">
      <span>{msg}</span>
      {onRetry && <Button variant="ghost" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export const Empty = ({ title, hint }: { title: string; hint?: string }) => (
  <div className="empty"><strong>{title}</strong>{hint && <span>{hint}</span>}</div>
);

export const Spinner = () => <div className="spinner" role="status" aria-label="Loading" />;

export function formErrorMessage(e: unknown) {
  if (e instanceof ApiError) {
    if (e.details?.length) return e.details.map((d) => `${d.path}: ${d.message}`).join('; ');
    return e.message;
  }
  return 'Something went wrong.';
}
