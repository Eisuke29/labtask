'use client'

import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import TaskCard from './TaskCard'
import SharedTaskCard from './SharedTaskCard'
import type { CategoryWithTasks, TaskWithCompletions, OwnerType } from '@/types'

interface Props {
  category: CategoryWithTasks
  isCollapsed: boolean
  onToggleCollapse: () => void
  currentUserId: string
  partnerId: string
  partnerName: string
  ownerType: OwnerType
  myColor: string
  onEditTask: (task: TaskWithCompletions) => void
  onToggleCompletion: (taskId: string, userId: string, isCompleted: boolean) => void
}

export default function CategoryGroup({
  category,
  isCollapsed,
  onToggleCollapse,
  currentUserId,
  partnerId,
  partnerName,
  ownerType,
  myColor,
  onEditTask,
  onToggleCompletion,
}: Props) {
  const activeTasks = category.tasks.filter((t) => !t.is_completed)
  const taskIds = activeTasks.map((t) => t.id)

  return (
    <div className="mb-3">
      {/* カテゴリヘッダー */}
      <button
        onClick={onToggleCollapse}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#1e1e2e]/50 transition-colors group"
      >
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: category.color }} />
        <span className="text-xs font-medium text-[#6b6b8a] group-hover:text-[#e8e8f0] flex-1 text-left">
          {category.name}
        </span>
        <span className="text-xs text-[#6b6b8a]">{activeTasks.length}</span>
        <svg
          className={`w-3.5 h-3.5 text-[#6b6b8a] transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* タスクリスト */}
      {!isCollapsed && (
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          <div className="mt-1 space-y-1.5 pl-1">
            {activeTasks.map((task) =>
              task.owner_type === 'shared' ? (
                <SharedTaskCard
                  key={task.id}
                  task={task}
                  currentUserId={currentUserId}
                  partnerId={partnerId}
                  partnerName={partnerName}
                  myColor={myColor}
                  onEdit={() => onEditTask(task)}
                  onToggleMine={() => onToggleCompletion(task.id, currentUserId, task.is_mine_completed)}
                  onTogglePartner={() => onToggleCompletion(task.id, partnerId, task.is_partner_completed)}
                />
              ) : (
                <TaskCard
                  key={task.id}
                  task={task}
                  currentUserId={currentUserId}
                  myColor={myColor}
                  onEdit={() => onEditTask(task)}
                  onToggle={() => {
                    const isOwner = task.created_by === currentUserId
                    const userId = isOwner ? currentUserId : partnerId
                    const isCompleted = isOwner ? task.is_mine_completed : task.is_partner_completed
                    onToggleCompletion(task.id, userId, isCompleted)
                  }}
                />
              )
            )}
            {activeTasks.length === 0 && (
              <p className="text-xs text-[#6b6b8a] pl-4 py-1">タスクなし</p>
            )}
          </div>
        </SortableContext>
      )}
    </div>
  )
}
