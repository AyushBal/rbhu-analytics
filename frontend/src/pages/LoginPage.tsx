import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../context/AuthContext';
import { Button, ErrorNote, Input } from '../components/ui';

const schema = z.object({ email: z.string().trim().email('Enter a valid email address'), password: z.string().min(1, 'Enter your password') });
type Form = z.infer<typeof schema>;

export function LoginPage() {
  const { user, login } = useAuth();
  const loc = useLocation();
  const [error, setError] = useState<unknown>();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { email: 'admin@rbhu.in', password: 'Admin@12345' },
  });

  if (user) return <Navigate to={(loc.state as { from?: string } | null)?.from ?? '/'} replace />;

  return (
    <div className="login">
      <form className="login-card" onSubmit={handleSubmit(async (v) => { setError(undefined); try { await login(v.email, v.password); } catch (e) { setError(e); } })} noValidate>
        <h1>Sign in to Dispatch</h1>
        <p className="muted">Demo credentials are pre-filled (mock authentication).</p>
        <Input label="Email" type="email" autoComplete="username" reg={register('email')} error={errors.email} />
        <Input label="Password" type="password" autoComplete="current-password" reg={register('password')} error={errors.password} />
        {!!error && <ErrorNote error={error} />}
        <Button type="submit" loading={isSubmitting}>Sign in</Button>
      </form>
    </div>
  );
}
