import Link from 'next/link';
import { Target, CheckCircle2, Calendar, ArrowRight, Sparkles } from 'lucide-react';
import Card from '@/components/ui/Card';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-app-bg via-white to-app-accentSoft">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-app-accent/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-ios-purple/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-ios-teal/5 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative max-w-5xl mx-auto px-6 pt-16 pb-20">
        {/* Hero Section */}
        <div className="text-center mb-16 animate-slide-up">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-app-accent/10 text-app-accent px-4 py-2 rounded-full text-sm font-semibold mb-8">
            <Sparkles size={16} />
            <span>Достигай целей легко</span>
          </div>

          {/* Main Title */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-app-text mb-6 tracking-tight leading-tight">
            Goal
            <span className="bg-gradient-to-r from-app-accent to-ios-purple bg-clip-text text-transparent"> Navigator</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-app-textMuted mb-10 font-medium max-w-2xl mx-auto leading-relaxed">
            Твой путь к целям начинается здесь. 
            <br className="hidden sm:block" />
            Превращай мечты в план, а план — в результат.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="group inline-flex items-center gap-3 bg-app-accent text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-ios-lg hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200"
            >
              <span>Начать бесплатно</span>
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-app-text hover:text-app-accent px-6 py-4 rounded-2xl font-semibold text-lg transition-colors"
            >
              Уже есть аккаунт? Войти
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { 
              icon: Target, 
              color: '#007AFF', 
              bgColor: 'bg-blue-50',
              title: 'Цели', 
              desc: 'Создавай большие цели и разбивай их на понятные шаги' 
            },
            { 
              icon: CheckCircle2, 
              color: '#34C759', 
              bgColor: 'bg-green-50',
              title: 'Задачи', 
              desc: 'Планируй свой день и отмечай выполненное' 
            },
            { 
              icon: Calendar, 
              color: '#FF9500', 
              bgColor: 'bg-orange-50',
              title: 'Календарь', 
              desc: 'Смотри прогресс и управляй временем' 
            },
          ].map((feature, i) => {
            const Icon = feature.icon;
            return (
              <Card 
                key={i} 
                variant="elevated" 
                className="group p-8 hover:scale-105 hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div 
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 shadow-ios group-hover:scale-110 transition-transform ${feature.bgColor}`}
                >
                  <Icon size={28} style={{ color: feature.color }} strokeWidth={2.5} />
                </div>
                <h3 className="text-xl font-bold text-app-text mb-3">{feature.title}</h3>
                <p className="text-app-textMuted leading-relaxed">{feature.desc}</p>
              </Card>
            );
          })}
        </div>

        {/* Bottom tagline */}
        <div className="text-center mt-16 text-app-textMuted">
          <p className="text-sm">
            Присоединяйся к тысячам людей, которые уже достигают своих целей
          </p>
        </div>
      </div>
    </div>
  );
}
