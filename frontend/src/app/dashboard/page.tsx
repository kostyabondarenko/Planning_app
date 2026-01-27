'use client';

import { useState, useEffect } from 'react';
import { 
  PlusCircle, ArrowLeft, Edit, Trash2, Check, X, ChevronRight
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

  // Сворачивание при возврате на страницу
  useEffect(() => {
    setSelectedGoalId(null);
    setAddingStepToGoalId(null);
    setEditingStepId(null);
  }, []);

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
      setSelectedGoalId(null);
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

  // Если выбрана цель - показываем полноэкранный вид
  if (selectedGoal) {
    return (
      <div className="min-h-screen bg-ios-gray-50">
        {/* Header с кнопкой назад */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  setSelectedGoalId(null);
                  setAddingStepToGoalId(null);
                  setEditingStepId(null);
                }}
                className="flex items-center gap-2 text-ios-blue font-bold hover:opacity-70 transition"
              >
                <ArrowLeft size={20} strokeWidth={2.5} />
                Цели
              </button>
              
              <button
                onClick={() => deleteGoal(selectedGoal.id)}
                className="p-2 text-ios-red hover:bg-red-50 rounded-xl transition"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Контент цели */}
        <div className="max-w-4xl mx-auto p-4">
          {/* Заголовок цели */}
          <div className="bg-white rounded-4xl p-6 shadow-ios mb-4">
            <div className="flex items-center gap-4 mb-2">
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl shadow-ios-lg"
                style={{ backgroundColor: selectedGoal.color }}
              >
                {selectedGoal.icon}
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-black text-gray-900 mb-1">
                  {selectedGoal.title}
                </h1>
                <p className="text-gray-600 font-semibold">
                  {selectedGoal.steps.filter(s => s.is_completed).length} из {selectedGoal.steps.length} шагов выполнено
                </p>
              </div>
              <div className="flex-shrink-0">
                <ProgressRing 
                  progress={calculateProgress(selectedGoal.steps)} 
                  size={80} 
                  strokeWidth={6} 
                  color={selectedGoal.color}
                >
                  <div className="text-center">
                    <div className="text-xl font-black text-gray-900">
                      {calculateProgress(selectedGoal.steps)}%
                    </div>
                  </div>
                </ProgressRing>
              </div>
            </div>
          </div>

          {/* Список шагов */}
          {selectedGoal.steps.length > 0 && (
            <div className="space-y-2 mb-4">
              {selectedGoal.steps.map((step, index) => (
                <div
                  key={step.id}
                  className="group bg-white rounded-2xl p-4 hover:shadow-ios transition-all"
                >
                  <div className="flex items-start gap-4">
                    <button
                      onClick={() => toggleStepComplete(selectedGoal.id, step.id)}
                      className="flex-shrink-0 mt-1"
                    >
                      {step.is_completed ? (
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-ios"
                          style={{ backgroundColor: selectedGoal.color }}
                        >
                          <Check size={18} strokeWidth={3} />
                        </div>
                      ) : (
                        <div 
                          className="w-8 h-8 rounded-full border-3"
                          style={{ borderColor: selectedGoal.color, borderWidth: '3px' }}
                        />
                      )}
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-lg ${step.is_completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                        {index + 1}. {step.title}
                      </p>
                      {step.date && (
                        <p className="text-sm text-gray-500 font-semibold mt-1">
                          📅 {new Date(step.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
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
                </div>
              ))}
            </div>
          )}

          {/* Форма добавления/редактирования шага */}
          {addingStepToGoalId === selectedGoal.id ? (
            <div className="bg-white rounded-2xl p-4 space-y-3 shadow-ios">
              <input
                type="text"
                value={stepFormData.title}
                onChange={(e) => setStepFormData({ ...stepFormData, title: e.target.value })}
                placeholder="Название шага"
                className="w-full px-4 py-3 bg-ios-gray-50 rounded-xl font-semibold border-0 focus:ring-2 focus:ring-ios-blue"
                autoFocus
              />
              <input
                type="date"
                value={stepFormData.date}
                onChange={(e) => setStepFormData({ ...stepFormData, date: e.target.value })}
                className="w-full px-4 py-3 bg-ios-gray-50 rounded-xl font-semibold border-0 focus:ring-2 focus:ring-ios-blue"
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
                    setStepFormData({ title: '', description: '', date: '', color: GOAL_PRESETS[0].color });
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
              className="w-full py-4 border-2 border-dashed border-gray-300 rounded-2xl text-ios-blue hover:border-ios-blue hover:bg-blue-50 transition-all font-bold flex items-center justify-center gap-2 bg-white"
            >
              <PlusCircle size={20} />
              Добавить шаг
            </button>
          )}
        </div>
      </div>
    );
  }

  // Основной вид - список целей
  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-black text-gray-900 mb-2">
            Мои Цели
          </h1>
          <p className="text-gray-600 text-lg">
            {goals.length === 0 ? 'Начни с первой цели' : `${goals.length} ${goals.length === 1 ? 'цель' : 'целей'}`}
          </p>
        </div>

        {/* Список целей */}
        {goals.length > 0 && (
          <div className="space-y-3 mb-4">
            {goals.map((goal, index) => {
              const progress = calculateProgress(goal.steps);
              
              return (
                <button
                  key={goal.id}
                  onClick={() => setSelectedGoalId(goal.id)}
                  className="w-full bg-white rounded-2xl p-4 hover:shadow-ios-lg transition-all text-left group animate-spring-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-ios flex-shrink-0"
                      style={{ backgroundColor: goal.color }}
                    >
                      {goal.icon}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-black text-gray-900 mb-1">
                        {goal.title}
                      </h3>
                      <p className="text-sm text-gray-600 font-semibold">
                        {goal.steps.filter(s => s.is_completed).length} из {goal.steps.length} шагов • {progress}%
                      </p>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <ProgressRing 
                        progress={progress} 
                        size={50} 
                        strokeWidth={4} 
                        color={goal.color}
                      >
                        <div className="text-xs font-black text-gray-900">
                          {progress}%
                        </div>
                      </ProgressRing>
                      
                      <ChevronRight 
                        size={24} 
                        className="text-gray-400 group-hover:text-ios-blue transition" 
                        strokeWidth={2.5}
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Кнопка добавления цели */}
        <button
          onClick={() => setIsAddingGoal(true)}
          className="w-full py-4 border-2 border-dashed border-gray-300 rounded-2xl text-ios-blue hover:border-ios-blue hover:bg-blue-50 transition-all font-bold flex items-center justify-center gap-2"
        >
          <PlusCircle size={24} strokeWidth={2.5} />
          Добавить цель
        </button>

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
          </div>
        )}
      </div>
    </div>
  );
}
