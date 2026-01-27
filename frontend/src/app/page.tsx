import Link from 'next/link';
import { Target, CheckCircle2, Calendar, ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-ios-gray-50">
      {/* Hero Section */}
      <div className="max-w-4xl mx-auto px-6 pt-20 pb-16">
        <div className="text-center mb-12">
          <h1 className="text-6xl md:text-7xl font-black text-gray-900 mb-4 tracking-tight">
            Goal<br/>Navigator
          </h1>
          <p className="text-xl text-gray-600 mb-8 font-medium">
            Твой путь к целям начинается здесь
          </p>
          
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 bg-ios-blue text-white px-8 py-4 rounded-2xl font-semibold text-lg shadow-ios-lg hover:shadow-2xl hover:scale-105 transition-all"
          >
            <span>Начать</span>
            <ArrowRight size={20} />
          </Link>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: Target, color: '#007AFF', title: 'Цели', desc: 'Создавай и достигай' },
            { icon: CheckCircle2, color: '#34C759', title: 'Задачи', desc: 'Планируй свой день' },
            { icon: Calendar, color: '#FF9500', title: 'Календарь', desc: 'Отслеживай прогресс' },
          ].map((feature, i) => {
            const Icon = feature.icon;
            return (
              <div
                key={i}
                className="bg-white p-6 rounded-3xl shadow-ios hover:shadow-ios-lg transition-all"
              >
                <div 
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shadow-ios"
                  style={{ backgroundColor: feature.color }}
                >
                  <Icon size={24} className="text-white" strokeWidth={2.5} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
