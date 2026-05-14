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
  partnerId: string
  partnerName: string
  myColor: string
  readOnly?: boolean
  onEdit: () => void
  onToggleMine: () => void
  onTogglePartner: () => void
}

export default function SharedTaskCard({ task, partnerName, myColor, readOnly, onEdit, onToggleMine, onTogglePartner }: Props) {
  const [fadeOut, setFadeOut] = useState(false)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id, disabled: readOnly })

  const sortableStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  }

  const handleToggleMine = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!task.is_mine_completed) {
      setTimeout(() => {
        if (task.is_partner_completed) {
          setFadeOut(true)
          setTimeout(() => { onToggleMine(); setFadeOut(false) }, 300)
        } else {
          onToggleMine()
        }
      }, 200)
    } else {
      onToggleMine()
    }
  }

  const isOverdue = task.due_date && new Date(task.due_date) < new Date()
  const isDueSoon = task.due_date && new Date(task.due_date) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
  const bothDone = task.is_mine_completed && task.is_partner_completed
  const urgency = getUrgencyStyle(task.due_date, myColor)

  return (
    <div
      ref={setNodeRef}
      style={{
        ...sortableStyle,
        backgroundColor: urgency.backgroundColor,
        borderColor: urgency.borderColor,
        borderWidth: urgency.borderWidth,
        borderStyle: 'solid',
      }}
      className={`group relative rounded-xl px-3 py-2.5 ${readOnly ? 'cursor-default' : 'cursor-pointer'}
        hover:translate-y-[-1px] hover:shadow-md hover:shadow-black/20
        transition-all duration-200
        ${fadeOut ? 'animate-fade-out' : ''}
        ${isDragging ? 'dragging' : ''}`}
      onClick={readOnly ? undefined : onEdit}
    >
      <div className="flex items-start gap-2.5">
        {/* Two completion circles */}
        <div className="flex gap-1 flex-shrink-0 mt-0.5">
          {/* Mine */}
          <button
            onClick={readOnly ? undefined : handleToggleMine}
            disabled={readOnly}
            title="自分"
            className={`w-[18px] h-[18px] rounded-full border-2 transition-all flex items-center justify-center
              ${readOnly
                ? 'opacity-40 cursor-not-allowed border-[#39ff14]/30'
                : task.is_mine_completed ? 'bg-[#39ff14] border-[#39ff14]' : 'border-[#39ff14]/50 hover:border-[#39ff14]'}`}
          >
            {task.is_mine_completed && (
              <svg className="w-2.5 h-2.5 text-[#0a0a0f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
          {/* Partner */}
          <button
            onClick={readOnly ? undefined : (e) => { e.stopPropagation(); onTogglePartner() }}
            disabled={readOnly}
            title={partnerName}
            className={`w-[18px] h-[18px] rounded-full border-2 transition-all flex items-center justify-center
              ${readOnly
                ? 'opacity-40 cursor-not-allowed border-[#7c3aed]/30'
                : task.is_partner_completed ? 'bg-[#7c3aed] border-[#7c3aed]' : 'border-[#7c3aed]/50 hover:border-[#7c3aed]'}`}
          >
            {task.is_partner_completed && (
              <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        </div>

        <div className="flex-1 min-w-0">
          {/* Title */}
          <p className={`text-sm font-medium leading-snug ${bothDone ? 'line-through text-[#6b6b8a]' : 'text-[#e8e8f0]'}`}>
            {task.title}
          </p>

          {/* Description */}
          {task.description && (
            <p className="text-xs text-[#6b6b8a] mt-0.5 leading-relaxed line-clamp-2">
              {task.description}
            </p>
          )}

          {/* Pending status */}
          {task.is_mine_completed !== task.is_partner_completed && (
            <p className="text-[10px] text-[#6b6b8a] mt-0.5">
              {task.is_mine_completed ? `${partnerName}が未完了` : '自分が未完了'}
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
              {task.notify_start_date && <span className="text-[11px] shrink-0">🔔</span>}
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
