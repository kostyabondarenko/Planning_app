'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, Lock, UserPlus, Check } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Field from '@/components/ui/Field';
import Input from '@/components/ui/Input';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert('Пароли не совпадают');
      return;
    }
    setIsLoading(true);
    // Logic for registration will go here
    console.log('Register with:', email, password);
    setTimeout(() => setIsLoading(false), 1000);
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

            <Button 
              type="submit" 
              className="w-full" 
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? 'Создаём аккаунт...' : 'Зарегистрироваться'}
            </Button>
          </form>

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
