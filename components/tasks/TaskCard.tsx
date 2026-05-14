'use client'

import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { TaskWithCompletions } from '@/types'
import { getUrgencyStyle } from '@/lib/colorUtils'

interface Props {
  task: TaskWithCompletions
  currentUserId: string
  myColor: string
  readOnly?: boolean
  onEdit: () => void
  onToggle: () => void
}

export default function TaskCard({ task, currentUserId, myColor, readOnly, onEdit, onToggle }: Props) {
  const [checking, setChecking] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)
  const isOwner = task.created_by === currentUserId
  const isCompleted = isOwner ? task.is_mine_completed : task.is_partner_completed

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id, disabled: readOnly })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  }

  const handleToggle = async () => {
    if (isCompleted) { onToggle(); return }
    setChecking(true)
    setTimeout(() => {
      setFadeOut(true)
      setTimeout(() => { onToggle(); setChecking(false); setFadeOut(false) }, 300)
    }, 300)
  }

  const isOverdue = task.due_date && new Date(task.due_date) < new Date()
  const isDueSoon = task.due_date && new Date(task.due_date) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
  const urgency = getUrgencyStyle(task.due_date, myColor)

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        backgroundColor: urgency.backgroundColor,
        borderColor: urgency.borderColor,
        borderWidth: urgency.borderWidth,
        borderStyle: 'solid',
      }}
      className={`group relative rounded-xl px-3 py-2.5 ${readOnly ? 'cursor-default' : 'cursor-pointer'}
        hover:translate-y-[-1px] hover:shadow-md hover:shadow-black/20
        transition-all duration-200
        ${fadeOut ? 'animate-fade-out' : 'animate-slide-in'}
        ${isDragging ? 'dragging' : ''}`}
      onClick={readOnly ? undefined : onEdit}
    >
      <div className="flex items-start gap-2.5">
        {/* Checkbox */}
        <button
          onClick={(e) => { e.stopPropagation(); handleToggle() }}
          className={`mt-0.5 flex-shrink-0 w-[18px] h-[18px] rounded-full border-2 transition-all duration-200 flex items-center justify-center
            ${isCompleted
              ? 'bg-[#39ff14] border-[#39ff14]'
              : checking
              ? 'border-[#39ff14] scale-110 animate-pulse-check'
              : 'border-[#3a3a52] hover:border-[#39ff14]'
            }`}
        >
          {isCompleted && (
            <svg className="w-2.5 h-2.5 text-[#0a0a0f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          {/* Title */}
          <p className={`text-sm font-medium leading-snug ${isCompleted ? 'line-through text-[#6b6b8a]' : 'text-[#e8e8f0]'}`}>
            {task.title}
          </p>

          {/* Description */}
          {task.description && (
            <p className="text-xs text-[#6b6b8a] mt-0.5 leading-relaxed line-clamp-2">
              {task.description}
            </p>
          )}

          {/* Due date + notify */}
          {(task.due_date || task.notify_start_date) && (
            <div className="flex items-center gap-1.5 mt-1.5 whitespace-nowrap overflow-hidden">
              {task.due_date && (
                <span className={`inline-flex items-center gap-0.5 text-[11px] font-mono shrink-0 ${
                  isOverdue ? 'text-red-400' : isDueSoon ? 'text-orange-400' : 'text-[#6b6b8a]'
                }`}>
                  📅{format(new Date(task.due_date), 'M/d(E)', { locale: ja })}
                </span>
              )}
              {task.notify_start_date && (
                <span className="text-[11px] shrink-0">🔔</span>
              )}
            </div>
          )}
        </div>

        {/* Drag handle */}
        {!readOnly && (
          <div
            {...attributes}
            {...listeners}
            className="flex-shrink-0 cursor-grab active:cursor-grabbing p-1 -mr-1 text-[#2a2a3e] hover:text-[#6b6b8a] transition-colors"
            style={{ touchAction: 'none' }}
            onClick={(e) => e.stopPropagation()}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm6 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM7 8a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm6 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm-6 6a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm6 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4z" />
            </svg>
          </div>
        )}
      </div>
    </div>
  )
}
