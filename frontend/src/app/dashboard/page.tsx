'use client';

import { useState, useEffect } from 'react';
import { 
  PlusCircle, ArrowLeft, Edit, Trash2, Check, X, ChevronRight
} from 'lucide-react';
import ProgressRing from '@/components/ProgressRing';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

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
      <div className="min-h-screen bg-app-bg">
        {/* Header с кнопкой назад */}
        <div className="bg-app-surface border-b border-app-border sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  setSelectedGoalId(null);
                  setAddingStepToGoalId(null);
                  setEditingStepId(null);
                }}
                className="flex items-center gap-2 text-app-accent font-bold hover:opacity-70 transition"
              >
                <ArrowLeft size={20} strokeWidth={2.5} />
                Цели
              </button>
              
              <button
                onClick={() => deleteGoal(selectedGoal.id)}
                className="p-2 text-app-danger hover:bg-red-50 rounded-xl transition"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Контент цели */}
        <div className="max-w-4xl mx-auto p-4">
          {/* Заголовок цели */}
          <div className="bg-app-surface rounded-4xl p-6 shadow-ios mb-4 border border-app-border">
            <div className="flex items-center gap-4 mb-2">
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl shadow-ios-lg"
                style={{ backgroundColor: selectedGoal.color }}
              >
                {selectedGoal.icon}
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-black text-app-text mb-1">
                  {selectedGoal.title}
                </h1>
                <p className="text-app-textMuted font-semibold">
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
                    <div className="text-xl font-black text-app-text">
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
                  className="group bg-app-surface rounded-2xl p-4 hover:shadow-ios transition-all border border-app-border"
                >
                  <div className="flex items-start gap-4">
                    <button
                      onClick={() => toggleStepComplete(selectedGoal.id, step.id)}
                      className="flex-shrink-0 mt-1 tap-target"
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
                      <p className={`font-bold text-lg ${step.is_completed ? 'line-through text-app-textMuted' : 'text-app-text'}`}>
                        {index + 1}. {step.title}
                      </p>
                      {step.date && (
                        <p className="text-sm text-app-textMuted font-semibold mt-1">
                          📅 {new Date(step.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button
                        onClick={() => startEditingStep(selectedGoal.id, step)}
                        className="p-2 text-app-accent hover:bg-app-accentSoft rounded-xl transition"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => deleteStep(selectedGoal.id, step.id)}
                        className="p-2 text-app-danger hover:bg-red-50 rounded-xl transition"
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
            <div className="bg-app-surface rounded-2xl p-4 space-y-3 shadow-ios border border-app-border">
              <Input
                type="text"
                value={stepFormData.title}
                onChange={(e) => setStepFormData({ ...stepFormData, title: e.target.value })}
                placeholder="Название шага"
                autoFocus
              />
              <Input
                type="date"
                value={stepFormData.date}
                onChange={(e) => setStepFormData({ ...stepFormData, date: e.target.value })}
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => handleSaveStep(selectedGoal.id)}
                  disabled={!stepFormData.title.trim()}
                  className="flex-1"
                >
                  {editingStepId ? 'Сохранить' : 'Добавить'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setAddingStepToGoalId(null);
                    setEditingStepId(null);
                    setStepFormData({ title: '', description: '', date: '', color: GOAL_PRESETS[0].color });
                  }}
                  className="px-4"
                >
                  <X size={20} />
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingStepToGoalId(selectedGoal.id)}
              className="w-full py-4 border-2 border-dashed border-app-border rounded-2xl text-app-accent hover:border-app-accent hover:bg-app-accentSoft transition-all font-bold flex items-center justify-center gap-2 bg-app-surface"
            >
              <PlusCircle size={20} />
              Добавить шаг
            </button>
          )}
        </div>
      </div>
    );
  }

  // Основной вид - mind map целей
  return (
    <div className="min-h-screen p-4 sm:p-6 bg-app-bg">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center sm:text-left">
          <h1 className="text-4xl sm:text-5xl font-black text-app-text mb-2">
            Мои Цели
          </h1>
          <p className="text-app-textMuted text-lg">
            {goals.length === 0 
              ? 'Начни свой путь к успеху' 
              : `${goals.length} ${goals.length === 1 ? 'цель' : goals.length < 5 ? 'цели' : 'целей'} в работе`
            }
          </p>
        </div>

        {/* Empty state */}
        {goals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 animate-slide-up">
            {/* Decorative illustration */}
            <div className="relative mb-8">
              <div className="w-32 h-32 bg-gradient-to-br from-app-accent/20 to-ios-purple/20 rounded-full flex items-center justify-center">
                <div className="w-24 h-24 bg-gradient-to-br from-app-accent/30 to-ios-purple/30 rounded-full flex items-center justify-center">
                  <span className="text-5xl">🎯</span>
                </div>
              </div>
              {/* Floating elements */}
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-ios-green rounded-xl flex items-center justify-center text-lg shadow-ios animate-bounce" style={{ animationDelay: '0.1s' }}>
                ⭐
              </div>
              <div className="absolute -bottom-2 -left-2 w-8 h-8 bg-ios-orange rounded-xl flex items-center justify-center text-lg shadow-ios animate-bounce" style={{ animationDelay: '0.3s' }}>
                🚀
              </div>
            </div>

            <h2 className="text-2xl font-black text-app-text mb-2">
              Создай первую цель
            </h2>
            <p className="text-app-textMuted text-center max-w-sm mb-8">
              Большой путь начинается с первого шага. Запиши свою мечту и начни двигаться к ней!
            </p>
            <Button 
              onClick={() => setIsAddingGoal(true)}
              size="lg"
              className="gap-2"
            >
              <PlusCircle size={20} />
              Создать цель
            </Button>
          </div>
        ) : (
          /* MindMap целей */
          <div className="mb-4 flex flex-col items-center w-full">
            <p className="text-sm text-app-textMuted mb-4 text-center">
              Нажми на цель, чтобы открыть детали
            </p>
            {(() => {
              const mapSize = 400;
              const center = mapSize / 2;
              const radius = mapSize / 2 - 80;
              const nodes = goals.map((goal, index) => {
                const angle = (2 * Math.PI * index) / goals.length - Math.PI / 2;
                return {
                  goal,
                  x: center + radius * Math.cos(angle),
                  y: center + radius * Math.sin(angle),
                };
              });

              return (
                <div className="relative w-full max-w-[380px] aspect-square mx-auto">
                  {/* Connection lines */}
                  <svg
                    viewBox={`0 0 ${mapSize} ${mapSize}`}
                    width="100%"
                    height="100%"
                    className="absolute inset-0"
                  >
                    <defs>
                      <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="rgba(0,122,255,0.3)" />
                        <stop offset="100%" stopColor="rgba(0,122,255,0.1)" />
                      </linearGradient>
                    </defs>
                    {nodes.map((node) => (
                      <line
                        key={node.goal.id}
                        x1={center}
                        y1={center}
                        x2={node.x}
                        y2={node.y}
                        stroke="url(#lineGradient)"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                      />
                    ))}
                  </svg>

                  {/* Central button */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <button
                      onClick={() => setIsAddingGoal(true)}
                      className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-app-accent to-ios-purple shadow-ios-lg flex flex-col items-center justify-center text-center px-3 text-white hover:scale-105 active:scale-95 transition-all"
                    >
                      <PlusCircle size={28} className="mb-1" />
                      <span className="font-bold text-sm">Новая цель</span>
                    </button>
                  </div>

                  {/* Goal nodes */}
                  {nodes.map((node, index) => {
                    const progress = calculateProgress(node.goal.steps);
                    return (
                      <button
                        key={node.goal.id}
                        onClick={() => setSelectedGoalId(node.goal.id)}
                        className="absolute -translate-x-1/2 -translate-y-1/2 bg-app-surface rounded-2xl px-4 py-3 border border-app-border shadow-ios hover:shadow-ios-lg hover:scale-105 active:scale-95 transition-all animate-spring-in"
                        style={{
                          left: `${(node.x / mapSize) * 100}%`,
                          top: `${(node.y / mapSize) * 100}%`,
                          animationDelay: `${index * 80}ms`,
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-ios flex-shrink-0"
                            style={{ backgroundColor: node.goal.color }}
                          >
                            {node.goal.icon}
                          </div>
                          <div className="text-left min-w-0">
                            <div className="text-sm font-bold text-app-text truncate max-w-[100px]">
                              {node.goal.title}
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-12 h-1.5 bg-app-surfaceMuted rounded-full overflow-hidden">
                                <div 
                                  className="h-full rounded-full transition-all"
                                  style={{ 
                                    width: `${progress}%`,
                                    backgroundColor: node.goal.color 
                                  }}
                                />
                              </div>
                              <span className="text-[11px] text-app-textMuted font-semibold">
                                {progress}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* Модалка создания цели */}
        {isAddingGoal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
            <div className="bg-app-surface rounded-4xl p-8 max-w-md w-full shadow-2xl animate-spring-in border border-app-border">
              <h2 className="text-2xl font-black text-app-text mb-6">Новая цель</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-app-text mb-2">
                    Название
                  </label>
                  <Input
                    type="text"
                    value={newGoalTitle}
                    onChange={(e) => setNewGoalTitle(e.target.value)}
                    placeholder="Например: Бегать каждый день"
                    className="text-lg font-semibold"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-app-text mb-3">
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
                            ? 'ring-4 ring-app-accent scale-110'
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
                  <Button
                    onClick={handleCreateGoal}
                    disabled={!newGoalTitle.trim()}
                    className="flex-1"
                    size="lg"
                  >
                    Создать
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={() => {
                      setIsAddingGoal(false);
                      setNewGoalTitle('');
                    }}
                    className="px-6"
                  >
                    <X size={24} />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
