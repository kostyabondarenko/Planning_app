'use client';

import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CheckCircle2, Circle, GripVertical } from 'lucide-react';
import { motion } from 'framer-motion';

interface Step {
  id: number;
  title: string;
  is_completed: boolean;
}

interface DraggableStepsProps {
  steps: Step[];
  onToggle: (stepId: number) => void;
  onReorder: (steps: Step[]) => void;
}

function SortableStep({ step, onToggle }: { step: Step; onToggle: (id: number) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-2 bg-white p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all group"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
      >
        <GripVertical size={18} />
      </div>
      
      <button
        onClick={() => onToggle(step.id)}
        className="flex items-center gap-3 flex-1 text-left"
      >
        {step.is_completed ? (
          <CheckCircle2 size={20} className="text-green-500 flex-shrink-0" />
        ) : (
          <Circle size={20} className="text-gray-300 flex-shrink-0 group-hover:text-blue-400 transition" />
        )}
        <span
          className={`text-sm ${
            step.is_completed ? 'line-through text-gray-400' : 'text-gray-700'
          }`}
        >
          {step.title}
        </span>
      </button>
    </motion.div>
  );
}

export default function DraggableSteps({ steps, onToggle, onReorder }: DraggableStepsProps) {
  const [items, setItems] = useState(steps);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      const newItems = arrayMove(items, oldIndex, newIndex);
      setItems(newItems);
      onReorder(newItems);
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map(s => s.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {items.map((step) => (
            <SortableStep key={step.id} step={step} onToggle={onToggle} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
