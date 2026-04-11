'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Mail, Lock, UserPlus, Check } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Field from '@/components/ui/Field';
import Input from '@/components/ui/Input';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function RegisterPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Ошибка регистрации');
      }
      
      // После успешной регистрации перенаправляем на логин
      router.push('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка регистрации');
    } finally {
      setIsLoading(false);
    }
  };

  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  return (
    <div className="min-h-screen bg-gradient-to-br from-app-bg via-white to-ios-green/10 flex items-center justify-center px-4 py-12">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-ios-green/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-app-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-slide-up">
        {/* Back link */}
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-app-textMuted hover:text-app-accent transition-colors mb-8 font-medium"
        >
          <ArrowLeft size={18} />
          На главную
        </Link>

        <Card variant="elevated" className="p-8 sm:p-10">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="w-16 h-16 bg-ios-green/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <UserPlus size={28} className="text-ios-green" />
            </div>
            <h1 className="text-3xl font-black text-app-text mb-2">Создать аккаунт</h1>
            <p className="text-app-textMuted">
              Присоединяйся и начни достигать целей
            </p>
          </div>

          {/* Google OAuth error */}
          {searchParams.get('error') === 'google_auth_failed' && (
            <div className="p-3 bg-app-danger/10 rounded-xl text-sm text-app-danger font-medium mb-4">
              Не удалось зарегистрироваться через Google. Попробуйте другой способ.
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <Field label="Email">
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-app-textMuted" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="pl-11"
                  required
                />
              </div>
            </Field>

            <Field label="Пароль" hint="Минимум 8 символов">
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-app-textMuted" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-11"
                  minLength={8}
                  required
                />
              </div>
            </Field>

            <Field label="Подтверди пароль">
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-app-textMuted" />
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`pl-11 ${passwordsMatch ? 'border-ios-green focus:border-ios-green' : ''}`}
                  required
                />
                {passwordsMatch && (
                  <Check size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-ios-green" />
                )}
              </div>
            </Field>

            {error && (
              <div className="p-3 bg-app-danger/10 rounded-xl text-sm text-app-danger font-medium">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? 'Создаём аккаунт...' : 'Зарегистрироваться'}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px" style={{ background: 'var(--border-light)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>или</span>
            <div className="flex-1 h-px" style={{ background: 'var(--border-light)' }} />
          </div>

          {/* Google Sign Up */}
          <button
            type="button"
            onClick={() => {
              window.location.href = `${API_BASE}/auth/google/login`;
            }}
            className="google-oauth-btn w-full flex items-center justify-center gap-3 px-6 py-3 font-semibold"
            style={{
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              backdropFilter: 'blur(var(--blur-sm))',
              WebkitBackdropFilter: 'blur(var(--blur-sm))',
              transition: 'all var(--transition-base)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Зарегистрироваться через Google
          </button>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-app-border text-center">
            <p className="text-app-textMuted">
              Уже есть аккаунт?{' '}
              <Link href="/login" className="text-app-accent font-semibold hover:underline">
                Войти
              </Link>
            </p>
          </div>
        </Card>

        {/* Terms */}
        <p className="text-center text-xs text-app-textMuted mt-6">
          Регистрируясь, вы соглашаетесь с условиями использования
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterPageInner />
    </Suspense>
  );
}
