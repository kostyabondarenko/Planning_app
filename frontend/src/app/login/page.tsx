'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Mail, Lock, LogIn } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Field from '@/components/ui/Field';
import Input from '@/components/ui/Input';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      // Backend expects OAuth2PasswordRequestForm (form-urlencoded)
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);
      
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Ошибка входа');
      }
      
      const data = await response.json();
      localStorage.setItem('token', data.access_token);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка входа');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-app-bg via-white to-app-accentSoft flex items-center justify-center px-4 py-12">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-72 h-72 bg-app-accent/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-ios-green/10 rounded-full blur-3xl" />
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
            <div className="w-16 h-16 bg-app-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <LogIn size={28} className="text-app-accent" />
            </div>
            <h1 className="text-3xl font-black text-app-text mb-2">С возвращением!</h1>
            <p className="text-app-textMuted">
              Войди, чтобы продолжить путь к целям
            </p>
          </div>

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

            <Field label="Пароль">
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-app-textMuted" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-11"
                  required
                />
              </div>
            </Field>

            <div className="flex justify-end">
              <button type="button" className="text-sm text-app-accent font-medium hover:underline">
                Забыли пароль?
              </button>
            </div>

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
              {isLoading ? 'Входим...' : 'Войти'}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-app-border text-center">
            <p className="text-app-textMuted">
              Нет аккаунта?{' '}
              <Link href="/register" className="text-app-accent font-semibold hover:underline">
                Зарегистрироваться
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
