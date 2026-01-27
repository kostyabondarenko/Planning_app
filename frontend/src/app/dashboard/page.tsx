'use client';

import { useState, useEffect } from 'react';
import { 
  PlusCircle, Target, Calendar, Edit, Trash2, Check, X
} from 'lucide-react';
import ProgressRing from '@/components/ProgressRing';

interface Step {
  id: number;
  title: string;
  description: string;
  date: string;
  color: string;
  is_completed: boolean;
}

interface Goal {
  id: number;
  title: string;
  description: string;
  steps: Step[];
  color: string;
  icon: string;
}

const GOAL_PRESETS = [
  { color: '#007AFF', icon: '🎯', name: 'Синий' },
  { color: '#34C759', icon: '🌱', name: 'Зеленый' },
  { color: '#FF9500', icon: '⭐', name: 'Оранжевый' },
  { color: '#FF3B30', icon: '❤️', name: 'Красный' },
  { color: '#AF52DE', icon: '💜', name: 'Фиолетовый' },
  { color: '#FF2D55', icon: '🌸', name: 'Розовый' },
  { color: '#5AC8FA', icon: '💧', name: 'Голубой' },
  { color: '#FFCC00', icon: '⚡', name: 'Желтый' },
];

export default function DashboardPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);
  const [editingStepId, setEditingStepId] = useState<number | null>(null);
  const [addingStepToGoalId, setAddingStepToGoalId] = useState<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalColor, setNewGoalColor] = useState(GOAL_PRESETS[0].color);
  const [newGoalIcon, setNewGoalIcon] = useState(GOAL_PRESETS[0].icon);

  const [stepFormData, setStepFormData] = useState({
    title: '',
    description: '',
    date: '',
    color: GOAL_PRESETS[0].color,
  });

  // Загрузка целей из localStorage при монтировании
  useEffect(() => {
    const stored = localStorage.getItem('goals');
    if (stored) {
      try {
        const loadedGoals = JSON.parse(stored);
        const updatedGoals = loadedGoals.map((g: Goal) => ({
          ...g,
          color: g.color || GOAL_PRESETS[0].color,
          icon: g.icon || GOAL_PRESETS[0].icon,
        }));
        setGoals(updatedGoals);
      } catch (e) {
        console.error('Ошибка загрузки целей:', e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Сохранение целей в localStorage при изменении (только после загрузки!)
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('goals', JSON.stringify(goals));
      window.dispatchEvent(new Event('storage'));
    }
  }, [goals, isLoaded]);

  const handleCreateGoal = () => {
    if (newGoalTitle.trim()) {
      const newGoal: Goal = {
        id: Date.now(),
        title: newGoalTitle,
        description: '',
        steps: [],
        color: newGoalColor,
        icon: newGoalIcon,
      };
      setGoals([...goals, newGoal]);
      setNewGoalTitle('');
      setIsAddingGoal(false);
    }
  };

  const handleSaveStep = (goalId: number) => {
    if (stepFormData.title.trim()) {
      if (editingStepId) {
        setGoals(goals.map(goal =>
          goal.id === goalId
            ? {
                ...goal,
                steps: goal.steps.map(step =>
                  step.id === editingStepId ? { ...step, ...stepFormData } : step
                ),
              }
            : goal
        ));
        setEditingStepId(null);
      } else {
        const newStep: Step = {
          id: Date.now(),
          ...stepFormData,
          is_completed: false,
        };
        setGoals(goals.map(goal =>
          goal.id === goalId ? { ...goal, steps: [...goal.steps, newStep] } : goal
        ));
      }
      
      setStepFormData({
        title: '',
        description: '',
        date: '',
        color: GOAL_PRESETS[0].color,
      });
      setAddingStepToGoalId(null);
    }
  };

  const startEditingStep = (goalId: number, step: Step) => {
    setEditingStepId(step.id);
    setAddingStepToGoalId(goalId);
    setStepFormData({
      title: step.title,
      description: step.description,
      date: step.date,
      color: step.color,
    });
  };

  const deleteGoal = (goalId: number) => {
    if (confirm('Удалить эту цель?')) {
      setGoals(goals.filter(g => g.id !== goalId));
    }
  };

  const deleteStep = (goalId: number, stepId: number) => {
    if (confirm('Удалить этот шаг?')) {
      setGoals(goals.map(goal =>
        goal.id === goalId
          ? { ...goal, steps: goal.steps.filter(s => s.id !== stepId) }
          : goal
      ));
    }
  };

  const toggleStepComplete = (goalId: number, stepId: number) => {
    setGoals(goals.map(goal =>
      goal.id === goalId
        ? {
            ...goal,
            steps: goal.steps.map(step =>
              step.id === stepId ? { ...step, is_completed: !step.is_completed } : step
            ),
          }
        : goal
    ));
  };

  const calculateProgress = (steps: Step[]) => {
    if (steps.length === 0) return 0;
    const completed = steps.filter(s => s.is_completed).length;
    return Math.round((completed / steps.length) * 100);
  };

  const selectedGoal = goals.find(g => g.id === selectedGoalId);

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black text-gray-900 mb-2">
            Мои Цели
          </h1>
          <p className="text-gray-600 text-lg">
            {goals.length === 0 ? 'Начни с первой цели' : `${goals.length} ${goals.length === 1 ? 'цель' : 'целей'}`}
          </p>
        </div>

        {/* Сетка целей - круглые кнопки */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 mb-8">
          {goals.map((goal, index) => {
            const progress = calculateProgress(goal.steps);
            
            return (
              <button
                key={goal.id}
                onClick={() => setSelectedGoalId(goal.id)}
                className="flex flex-col items-center animate-spring-in hover:scale-105 transition-transform"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <ProgressRing progress={progress} size={110} strokeWidth={6} color={goal.color}>
                  <div 
                    className="w-20 h-20 rounded-full flex items-center justify-center text-4xl shadow-ios-lg"
                    style={{ backgroundColor: goal.color }}
                  >
                    {goal.icon}
                  </div>
                </ProgressRing>
                <p className="text-gray-900 font-bold mt-3 text-sm text-center leading-tight">
                  {goal.title}
                </p>
                <p className="text-gray-500 text-xs font-semibold mt-1">
                  {progress}%
                </p>
              </button>
            );
          })}

          {/* Кнопка добавления */}
          <button
            onClick={() => setIsAddingGoal(true)}
            className="flex flex-col items-center hover:scale-105 transition-transform"
          >
            <div className="w-[110px] h-[110px] flex items-center justify-center">
              <div className="w-20 h-20 rounded-full border-4 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-ios-blue hover:text-ios-blue transition-all shadow-ios">
                <PlusCircle size={40} strokeWidth={2.5} />
              </div>
            </div>
            <p className="text-gray-600 font-bold mt-3 text-sm">
              Добавить
            </p>
          </button>
        </div>

        {/* Модалка создания цели */}
        {isAddingGoal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-4xl p-8 max-w-md w-full shadow-2xl animate-spring-in">
              <h2 className="text-2xl font-black text-gray-900 mb-6">Новая цель</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Название
                  </label>
                  <input
                    type="text"
                    value={newGoalTitle}
                    onChange={(e) => setNewGoalTitle(e.target.value)}
                    placeholder="Например: Бегать каждый день"
                    className="w-full px-4 py-3 bg-ios-gray-50 border-0 rounded-xl text-lg font-semibold focus:ring-2 focus:ring-ios-blue"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    Выбери стиль
                  </label>
                  <div className="grid grid-cols-4 gap-3">
                    {GOAL_PRESETS.map((preset) => (
                      <button
                        key={preset.color}
                        onClick={() => {
                          setNewGoalColor(preset.color);
                          setNewGoalIcon(preset.icon);
                        }}
                        className={`aspect-square rounded-2xl flex items-center justify-center text-3xl transition-all shadow-ios ${
                          newGoalColor === preset.color
                            ? 'ring-4 ring-ios-blue scale-110'
                            : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: preset.color }}
                      >
                        {preset.icon}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleCreateGoal}
                    disabled={!newGoalTitle.trim()}
                    className="flex-1 bg-ios-blue text-white px-6 py-4 rounded-xl font-bold text-lg shadow-ios-lg hover:shadow-2xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Создать
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingGoal(false);
                      setNewGoalTitle('');
                    }}
                    className="px-6 py-4 bg-ios-gray-50 text-gray-700 rounded-xl hover:bg-ios-gray-100 transition font-bold"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Детали выбранной цели */}
        {selectedGoal && (
          <div className="bg-white rounded-4xl p-6 shadow-ios-lg animate-slide-up">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div 
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-ios-lg"
                  style={{ backgroundColor: selectedGoal.color }}
                >
                  {selectedGoal.icon}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900">{selectedGoal.title}</h2>
                  <p className="text-gray-600 font-semibold">
                    {selectedGoal.steps.filter(s => s.is_completed).length} / {selectedGoal.steps.length} выполнено
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => deleteGoal(selectedGoal.id)}
                  className="p-2 text-ios-red hover:bg-red-50 rounded-xl transition"
                >
                  <Trash2 size={20} />
                </button>
                <button
                  onClick={() => setSelectedGoalId(null)}
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-xl transition"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Шаги */}
            {selectedGoal.steps.length > 0 && (
              <div className="space-y-2 mb-4">
                {selectedGoal.steps.map((step) => (
                  <div
                    key={step.id}
                    className="group flex items-center gap-4 bg-ios-gray-50 rounded-2xl p-4 hover:bg-ios-gray-100 transition-all"
                  >
                    <button
                      onClick={() => toggleStepComplete(selectedGoal.id, step.id)}
                      className="flex-shrink-0"
                    >
                      {step.is_completed ? (
                        <div 
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white shadow-ios"
                          style={{ backgroundColor: selectedGoal.color }}
                        >
                          <Check size={18} strokeWidth={3} />
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-full border-2 border-gray-300" />
                      )}
                    </button>
                    
                    <div className="flex-1">
                      <p className={`font-bold ${step.is_completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                        {step.title}
                      </p>
                      {step.date && (
                        <p className="text-sm text-gray-500 font-semibold mt-1">
                          {new Date(step.date).toLocaleDateString('ru-RU')}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEditingStep(selectedGoal.id, step)}
                        className="p-2 text-ios-blue hover:bg-blue-50 rounded-xl transition"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => deleteStep(selectedGoal.id, step.id)}
                        className="p-2 text-ios-red hover:bg-red-50 rounded-xl transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Форма шага */}
            {addingStepToGoalId === selectedGoal.id ? (
              <div className="bg-ios-gray-50 rounded-2xl p-4 space-y-3">
                <input
                  type="text"
                  value={stepFormData.title}
                  onChange={(e) => setStepFormData({ ...stepFormData, title: e.target.value })}
                  placeholder="Название шага"
                  className="w-full px-4 py-3 bg-white rounded-xl font-semibold border-0 focus:ring-2 focus:ring-ios-blue"
                  autoFocus
                />
                <input
                  type="date"
                  value={stepFormData.date}
                  onChange={(e) => setStepFormData({ ...stepFormData, date: e.target.value })}
                  className="w-full px-4 py-3 bg-white rounded-xl font-semibold border-0 focus:ring-2 focus:ring-ios-blue"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSaveStep(selectedGoal.id)}
                    disabled={!stepFormData.title.trim()}
                    className="flex-1 bg-ios-blue text-white px-4 py-3 rounded-xl font-bold shadow-ios hover:scale-105 transition-all disabled:opacity-50"
                  >
                    {editingStepId ? 'Сохранить' : 'Добавить'}
                  </button>
                  <button
                    onClick={() => {
                      setAddingStepToGoalId(null);
                      setEditingStepId(null);
                    }}
                    className="px-4 py-3 bg-ios-gray-100 text-gray-700 rounded-xl hover:bg-ios-gray-200 transition font-bold"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingStepToGoalId(selectedGoal.id)}
                className="w-full py-4 border-2 border-dashed border-gray-300 rounded-2xl text-ios-blue hover:border-ios-blue hover:bg-blue-50 transition-all font-bold flex items-center justify-center gap-2"
              >
                <PlusCircle size={20} />
                Добавить шаг
              </button>
            )}
          </div>
        )}

        {/* Пустое состояние */}
        {goals.length === 0 && (
          <div className="text-center py-20 animate-slide-up">
            <div className="text-6xl mb-6">🎯</div>
            <h3 className="text-2xl font-black text-gray-900 mb-3">
              Начни с первой цели!
            </h3>
            <p className="text-gray-600 mb-8 text-lg">
              Разбей большую мечту на шаги
            </p>
            <button
              onClick={() => setIsAddingGoal(true)}
              className="inline-flex items-center gap-3 bg-ios-blue text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-ios-lg hover:scale-105 transition-all"
            >
              <PlusCircle size={24} />
              Создать цель
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
