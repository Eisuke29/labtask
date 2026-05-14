'use client'

import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import CategoryGroup from './CategoryGroup'
import type { CategoryWithTasks, TaskWithCompletions, OwnerType } from '@/types'

interface Props {
  title: string
  accentColor: string
  ownerType: OwnerType
  categories: CategoryWithTasks[]
  currentUserId: string
  partnerId: string
  partnerName: string
  myColor: string
  allCategories: CategoryWithTasks[]
  onAddTask: () => void
  onEditTask: (task: TaskWithCompletions) => void
  onToggleCompletion: (taskId: string, userId: string, isCompleted: boolean) => void
  onUpdateTaskOrder: (taskId: string, sortOrder: number, categoryId?: string) => void
  onUpdateCategoryOrder: (catId: string, sortOrder: number) => void
}

export default function TaskColumn({
  title,
  accentColor,
  ownerType,
  categories,
  currentUserId,
  partnerId,
  partnerName,
  myColor,
  allCategories,
  onAddTask,
  onEditTask,
  onToggleCompletion,
  onUpdateTaskOrder,
  onUpdateCategoryOrder,
}: Props) {
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set())

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const toggleCategoryCollapse = (catId: string) => {
    setCollapsedCats((prev) => {
      const next = new Set(prev)
      next.has(catId) ? next.delete(catId) : next.add(catId)
      return next
    })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeTask = categories.flatMap((c) => c.tasks).find((t) => t.id === active.id)
    const overTask = categories.flatMap((c) => c.tasks).find((t) => t.id === over.id)

    if (activeTask && overTask) {
      onUpdateTaskOrder(activeTask.id, overTask.sort_order, overTask.category_id)
      onUpdateTaskOrder(overTask.id, activeTask.sort_order)
    }
  }

  const activeTasks = categories.flatMap((c) => c.tasks).filter((t) => !t.is_completed)
  const totalActive = activeTasks.length

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* カラムヘッダー */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-[#1e1e2e] sticky top-0 md:top-[65px] z-30 bg-[#0a0a0f]"
        style={{ borderTopColor: accentColor }}
      >
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 rounded-full" style={{ backgroundColor: accentColor }} />
          <h2 className="font-heading font-semibold text-sm text-[#e8e8f0]">{title}</h2>
          {totalActive > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#1e1e2e] text-[#6b6b8a]">
              {totalActive}
            </span>
          )}
        </div>
        <button
          onClick={onAddTask}
          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-[#1e1e2e] text-[#6b6b8a] hover:text-[#e8e8f0] hover:border-[#6b6b8a] transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          追加
        </button>
      </div>

      {/* カテゴリリスト */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {categories.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[#6b6b8a] text-sm">タスクがありません</p>
            <button
              onClick={onAddTask}
              className="mt-3 text-xs text-[#00d4ff] hover:underline"
            >
              最初のタスクを作成
            </button>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            {categories.map((cat) => (
              <CategoryGroup
                key={cat.id}
                category={cat}
                isCollapsed={collapsedCats.has(cat.id)}
                onToggleCollapse={() => toggleCategoryCollapse(cat.id)}
                currentUserId={currentUserId}
                partnerId={partnerId}
                partnerName={partnerName}
                ownerType={ownerType}
                myColor={myColor}
                onEditTask={onEditTask}
                onToggleCompletion={onToggleCompletion}
              />
            ))}
          </DndContext>
        )}
      </div>
    </div>
  )
}
