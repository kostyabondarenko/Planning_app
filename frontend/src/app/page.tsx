import Link from 'next/link';
import { Target, CheckCircle2, Calendar, ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-sm font-medium mb-6">
          <Target size={16} />
          <span>Твой личный помощник в достижении целей</span>
        </div>
        
        <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-6 tracking-tight">
          Управляй своими <span className="text-blue-600">целями</span> <br /> 
          просто и эффективно
        </h1>
        
        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
          Разбивай большие мечты на маленькие шаги, планируй свой день и следи за прогрессом в одном удобном приложении.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link 
            href="/dashboard" 
            className="flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition shadow-lg shadow-blue-200"
          >
            Начать бесплатно
            <ArrowRight size={20} />
          </Link>
          <Link 
            href="/login" 
            className="px-8 py-4 text-gray-600 font-bold text-lg hover:bg-gray-50 rounded-xl transition"
          >
            Войти
          </Link>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-6xl mx-auto px-6 py-20 border-t border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="space-y-4">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
              <Target size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Умные цели</h3>
            <p className="text-gray-600">Создавай глобальные цели и разбивай их на понятные шаги. Навигатор поможет не сбиться с пути.</p>
          </div>

          <div className="space-y-4">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-900">План на день</h3>
            <p className="text-gray-600">Фокусируйся на самом важном. Быстрые задачи на сегодня помогут двигаться вперед каждый день.</p>
          </div>

          <div className="space-y-4">
            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center">
              <Calendar size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Календарь</h3>
            <p className="text-gray-600">Визуализируй свою нагрузку и дедлайны. Ни одна важная дата не будет пропущена.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
