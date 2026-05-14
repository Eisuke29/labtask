'use client'

import { Fragment, useState, useRef } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import TaskCard from './TaskCard'
import SharedTaskCard from './SharedTaskCard'
import type { TaskWithCompletions, OwnerType } from '@/types'

interface Props {
  droppableId: string
  title: string
  color: string
  tasks: TaskWithCompletions[]
  currentUserId: string
  partnerId: string
  partnerName: string
  ownerType: OwnerType
  readOnly?: boolean
  canAdd?: boolean
  /** undefined = not the drop target; null = insert at end; string = insert before that task id */
  insertBefore?: string | null
  activeId?: string | null
  onQuickAdd: (title: string, sortOrder?: number, dueDate?: string, description?: string, notifyStart?: string, notifyEnd?: string) => Promise<{ error: unknown }>
  onAddFull: () => void
  onEditTask: (task: TaskWithCompletions) => void
  onToggleCompletion: (taskId: string, userId: string, isCompleted: boolean) => void
  onDelete?: () => Promise<void>
}

type AddPhase =
  | { kind: 'none' }
  | { kind: 'picking' }
  | { kind: 'typing'; before: string | null }

function InsertionIndicator({ color }: { color: string }) {
  return (
    <div className="flex items-center gap-1.5 px-1 py-0.5 pointer-events-none mb-1.5">
      <div
        className="w-3 h-3 rounded-full border-2 flex-shrink-0"
        style={{ borderColor: color, backgroundColor: color + '33' }}
      />
      <div className="flex-1 h-[2px] rounded-full" style={{ backgroundColor: color }} />
    </div>
  )
}

function InsertPoint({ color, label, onClick }: { color: string; label?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 py-1 px-1 rounded-lg transition-all hover:bg-[#1e1e2e]/50 active:scale-[0.98]"
    >
      <div className="flex-1 h-px" style={{ backgroundColor: color + '60' }} />
      <div
        className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border"
        style={{ borderColor: color + '80', color }}
      >
        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
        {label ?? 'ここに追加'}
      </div>
      <div className="flex-1 h-px" style={{ backgroundColor: color + '60' }} />
    </button>
  )
}

interface InlineInputProps {
  inputRef: React.RefObject<HTMLInputElement | null>
  title: string
  dueDate: string
  description: string
  notifyStart: string
  color: string
  adding: boolean
  error?: string
  onChangeTitle: (v: string) => void
  onChangeDueDate: (v: string) => void
  onChangeDescription: (v: string) => void
  onChangeNotifyStart: (v: string) => void
  onSubmit: () => void
  onCancel: () => void
}

function InlineInput({
  inputRef, title, dueDate, description, notifyStart,
  color, adding, error,
  onChangeTitle, onChangeDueDate, onChangeDescription, onChangeNotifyStart,
  onSubmit, onCancel,
}: InlineInputProps) {
  return (
    <div className="mb-1.5 rounded-xl border-2 overflow-hidden bg-[#0a0a0f]" style={{ borderColor: error ? '#ff006e' : color + '80' }}>
      {/* Title */}
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => onChangeTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); onSubmit() }
          if (e.key === 'Escape') onCancel()
        }}
        placeholder="タスク名 (Enter で追加)"
        disabled={adding}
        className="w-full bg-transparent px-3 pt-2 pb-1 text-sm text-[#e8e8f0] placeholder-[#6b6b8a] focus:outline-none disabled:opacity-50"
      />
      {/* Description */}
      <input
        value={description}
        onChange={(e) => onChangeDescription(e.target.value)}
        placeholder="メモ（任意）"
        disabled={adding}
        className="w-full bg-transparent px-3 pb-1 text-xs text-[#6b6b8a] placeholder-[#3a3a52] focus:outline-none disabled:opacity-50"
      />
      {/* Notify start → Due date (vertical pair) */}
      <div className="px-3 pb-1.5 mt-0.5">
        {/* Notify start */}
        <div className="flex items-center gap-2">
          <span className="text-[#7c3aed] text-xs w-3 flex-shrink-0">🔔</span>
          <input
            type="date"
            value={notifyStart}
            onChange={(e) => onChangeNotifyStart(e.target.value)}
            disabled={adding}
            className="bg-transparent text-xs text-[#7c3aed]/80 focus:outline-none disabled:opacity-50 [color-scheme:dark] flex-1"
          />
        </div>
        {/* Vertical connector */}
        <div className="flex items-center gap-2 py-0.5">
          <div className="w-3 flex-shrink-0 flex justify-center">
            <div className="w-px h-3 bg-[#2a2a3e]" />
          </div>
          {notifyStart && dueDate && (
            <span className="text-[10px] text-[#6b6b8a] leading-none">通知終了: {dueDate.slice(5).replace('-', '/')}（期限日）</span>
          )}
          {notifyStart && !dueDate && (
            <span className="text-[10px] text-amber-500/70 leading-none">期限日を設定すると自動で終了日が入ります</span>
          )}
        </div>
        {/* Due date */}
        <div className="flex items-center gap-2">
          <svg className="w-3 h-3 text-[#6b6b8a] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => onChangeDueDate(e.target.value)}
            disabled={adding}
            className="bg-transparent text-xs text-[#6b6b8a] focus:outline-none disabled:opacity-50 [color-scheme:dark] flex-1"
          />
        </div>
      </div>
      {error && <p className="text-[10px] text-[#ff006e] px-3 pb-1">{error}</p>}
      <div className="flex gap-2 px-2 pb-2">
        <button
          onClick={onSubmit}
          disabled={adding || !title.trim()}
          className="flex-1 py-1 text-xs rounded-lg font-medium disabled:opacity-50 active:scale-95 transition-all text-[#0a0a0f]"
          style={{ backgroundColor: color }}
        >
          {adding ? '追加中...' : '追加'}
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1 text-xs border border-[#1e1e2e] text-[#6b6b8a] rounded-lg active:scale-95 transition-all"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

export default function KanbanColumn({
  droppableId, title, color, tasks,
  currentUserId, partnerId, partnerName,
  ownerType, readOnly, canAdd,
  insertBefore, activeId,
  onQuickAdd, onAddFull, onEditTask, onToggleCompletion, onDelete,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: droppableId })
  const [addPhase, setAddPhase] = useState<AddPhase>({ kind: 'none' })
  const [quickTitle, setQuickTitle] = useState('')
  const [quickDueDate, setQuickDueDate] = useState('')
  const [quickDescription, setQuickDescription] = useState('')
  const [quickNotifyStart, setQuickNotifyStart] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const activeTasks = tasks
    .filter((t) => !t.is_completed)
    .sort((a, b) => a.sort_order - b.sort_order)
  const taskIds = activeTasks.map((t) => t.id)

  const isTarget = insertBefore !== undefined
  const showEndIndicator = isTarget && insertBefore === null

  const computeSortOrder = (before: string | null): number => {
    if (before === null) {
      return activeTasks.length > 0
        ? Math.max(...activeTasks.map((t) => t.sort_order)) + 1
        : 1
    }
    const idx = activeTasks.findIndex((t) => t.id === before)
    if (idx <= 0) {
      return activeTasks.length > 0 ? activeTasks[0].sort_order - 1 : 1
    }
    return (activeTasks[idx - 1].sort_order + activeTasks[idx].sort_order) / 2
  }

  const startAdding = () => {
    if (activeTasks.length === 0) {
      setAddPhase({ kind: 'typing', before: null })
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setAddPhase({ kind: 'picking' })
    }
  }

  const selectPosition = (before: string | null) => {
    setAddPhase({ kind: 'typing', before })
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const submitAdd = async () => {
    if (!quickTitle.trim() || addPhase.kind !== 'typing') return
    setAdding(true)
    setAddError('')
    const sortOrder = computeSortOrder(addPhase.before)
    // notify_end_date auto-fills from due_date when notify_start_date is set
    const notifyEnd = quickNotifyStart ? (quickDueDate || undefined) : undefined
    const { error } = await onQuickAdd(
      quickTitle.trim(), sortOrder,
      quickDueDate || undefined, quickDescription || undefined,
      quickNotifyStart || undefined, notifyEnd,
    )
    setAdding(false)
    if (error) {
      console.error('[KanbanColumn] onQuickAdd failed:', error)
      setAddError('追加に失敗しました。ブラウザのコンソールでエラーを確認してください。')
      return
    }
    setQuickTitle('')
    setQuickDueDate('')
    setQuickDescription('')
    setQuickNotifyStart('')
    setAddPhase({ kind: 'none' })
  }

  const cancelAdd = () => {
    setAddPhase({ kind: 'none' })
    setQuickTitle('')
    setQuickDueDate('')
    setQuickDescription('')
    setQuickNotifyStart('')
    setAddError('')
  }

  const isAdding = addPhase.kind !== 'none'

  return (
    <div
      className="flex flex-col h-full bg-[#0d0d14] rounded-xl border border-[#1e1e2e] transition-colors"
    >
      {/* Column header */}
      <div className="flex-shrink-0 flex items-center justify-between px-3 py-2.5 border-b border-[#1e1e2e]">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-sm font-semibold text-[#e8e8f0] truncate">{title}</h3>
          {activeTasks.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-[#1e1e2e] text-[#6b6b8a] flex-shrink-0">
              {activeTasks.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isAdding && (
            <button onClick={cancelAdd} className="text-xs text-[#6b6b8a] hover:text-[#e8e8f0] transition-colors px-2 py-1 rounded">
              キャンセル
            </button>
          )}
          {!readOnly && !isAdding && !confirmDelete && (
            <>
              <button
                onClick={onAddFull}
                title="詳細付きで追加"
                className="flex-shrink-0 text-[#6b6b8a] hover:text-[#e8e8f0] transition-colors p-1 rounded active:scale-90"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              {onDelete && (
                <button
                  onClick={() => setConfirmDelete(true)}
                  title="リストを削除"
                  className="flex-shrink-0 text-[#3a3a52] hover:text-[#ff006e] transition-colors p-1 rounded active:scale-90"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </>
          )}
          {confirmDelete && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-[#ff006e] flex-shrink-0">削除?</span>
              <button
                onClick={async () => { setDeleting(true); await onDelete?.(); setDeleting(false); setConfirmDelete(false) }}
                disabled={deleting}
                className="text-[10px] text-[#ff006e] px-1.5 py-0.5 rounded border border-[#ff006e]/40 hover:bg-[#ff006e]/10 transition-colors disabled:opacity-50"
              >
                {deleting ? '...' : 'はい'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-[10px] text-[#6b6b8a] px-1.5 py-0.5 rounded border border-[#1e1e2e] hover:bg-[#1e1e2e]/50 transition-colors"
              >
                いいえ
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Task list — droppable area */}
      <div
        ref={setNodeRef}
        data-scroll="column"
        className={`flex-1 overflow-y-auto p-2 min-h-[80px] rounded-b-xl transition-colors ${
          isOver && !isTarget ? 'bg-[#1e1e2e]/30' : ''
        }`}
      >
        {/* ── Position picker mode ─────────────────────────────── */}
        {addPhase.kind === 'picking' && (
          <div>
            <p className="text-[10px] text-center text-[#6b6b8a] pb-1">どこに追加しますか？</p>
            <InsertPoint
              color={color}
              label="先頭"
              onClick={() => selectPosition(activeTasks[0]?.id ?? null)}
            />
            {activeTasks.map((task, i) => (
              <Fragment key={task.id}>
                <div className="opacity-50 pointer-events-none my-0.5">
                  <div className="bg-[#13131a] rounded-lg px-3 py-2 border border-[#1e1e2e]">
                    <p className="text-xs text-[#a0a0b8] truncate">{task.title}</p>
                    {task.due_date && (
                      <p className="text-[10px] text-[#6b6b8a] mt-0.5 font-mono">{task.due_date.slice(5)}</p>
                    )}
                  </div>
                </div>
                <InsertPoint
                  color={color}
                  label={i === activeTasks.length - 1 ? '末尾' : undefined}
                  onClick={() => selectPosition(activeTasks[i + 1]?.id ?? null)}
                />
              </Fragment>
            ))}
          </div>
        )}

        {/* ── Normal / typing mode ─────────────────────────────── */}
        {addPhase.kind !== 'picking' && (
          <>
            {/* Top add button */}
            {canAdd && !readOnly && addPhase.kind === 'none' && (
              <button
                onClick={startAdding}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 mb-1.5 text-[#6b6b8a] hover:text-[#e8e8f0] hover:bg-[#1e1e2e]/30 transition-colors text-xs rounded-lg active:scale-[0.98] border border-dashed border-[#1e1e2e] hover:border-[#6b6b8a]"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                追加
              </button>
            )}

            {/* Inline input before first task */}
            {addPhase.kind === 'typing' && activeTasks.length > 0 && addPhase.before === activeTasks[0].id && (
              <InlineInput
                inputRef={inputRef}
                title={quickTitle}
                dueDate={quickDueDate}
                description={quickDescription}
                notifyStart={quickNotifyStart}
                color={color}
                adding={adding}
                error={addError}
                onChangeTitle={setQuickTitle}
                onChangeDueDate={setQuickDueDate}
                onChangeDescription={setQuickDescription}
                onChangeNotifyStart={setQuickNotifyStart}
                onSubmit={submitAdd}
                onCancel={cancelAdd}
              />
            )}

            {/* Inline input when no tasks */}
            {addPhase.kind === 'typing' && activeTasks.length === 0 && (
              <InlineInput
                inputRef={inputRef}
                title={quickTitle}
                dueDate={quickDueDate}
                description={quickDescription}
                notifyStart={quickNotifyStart}
                color={color}
                adding={adding}
                error={addError}
                onChangeTitle={setQuickTitle}
                onChangeDueDate={setQuickDueDate}
                onChangeDescription={setQuickDescription}
                onChangeNotifyStart={setQuickNotifyStart}
                onSubmit={submitAdd}
                onCancel={cancelAdd}
              />
            )}

            <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
              {activeTasks.map((task, i) => {
                const isDraggedItem = task.id === activeId
                const showIndicatorBefore = isTarget && insertBefore === task.id

                return (
                  <Fragment key={task.id}>
                    {showIndicatorBefore && <InsertionIndicator color={color} />}
                    <div
                      className="mb-1.5 transition-opacity duration-150"
                      style={{ opacity: isDraggedItem ? 0 : 1 }}
                    >
                      {task.owner_type === 'shared' ? (
                        <SharedTaskCard
                          task={task}
                          currentUserId={currentUserId}
                          partnerId={partnerId}
                          partnerName={partnerName}
                          myColor={color}
                          readOnly={readOnly}
                          onEdit={() => onEditTask(task)}
                          onToggleMine={() => onToggleCompletion(task.id, currentUserId, task.is_mine_completed)}
                          onTogglePartner={() => onToggleCompletion(task.id, partnerId, task.is_partner_completed)}
                        />
                      ) : (
                        <TaskCard
                          task={task}
                          currentUserId={currentUserId}
                          myColor={color}
                          readOnly={readOnly}
                          onEdit={() => onEditTask(task)}
                          onToggle={() => {
                            const isOwner = task.created_by === currentUserId
                            const userId = isOwner ? currentUserId : partnerId
                            const completed = isOwner ? task.is_mine_completed : task.is_partner_completed
                            onToggleCompletion(task.id, userId, completed)
                          }}
                        />
                      )}
                    </div>
                    {/* Inline input after task i (= before task i+1, or end if i is last) */}
                    {addPhase.kind === 'typing' && addPhase.before === (activeTasks[i + 1]?.id ?? null) && (
                      <InlineInput
                        inputRef={inputRef}
                        title={quickTitle}
                        dueDate={quickDueDate}
                        description={quickDescription}
                        notifyStart={quickNotifyStart}
                        color={color}
                        adding={adding}
                        error={addError}
                        onChangeTitle={setQuickTitle}
                        onChangeDueDate={setQuickDueDate}
                        onChangeDescription={setQuickDescription}
                        onChangeNotifyStart={setQuickNotifyStart}
                        onSubmit={submitAdd}
                        onCancel={cancelAdd}
                      />
                    )}
                  </Fragment>
                )
              })}
            </SortableContext>

            {/* DnD end-of-list indicator */}
            {showEndIndicator && <InsertionIndicator color={color} />}

            {/* Empty state */}
            {activeTasks.length === 0 && addPhase.kind === 'none' && !isTarget && (
              <div className="flex items-center justify-center h-16 rounded-lg border border-dashed border-[#1e1e2e]">
                <p className="text-xs text-[#6b6b8a]">タスクなし</p>
              </div>
            )}
            {activeTasks.length === 0 && addPhase.kind === 'none' && isTarget && (
              <div className="py-2">
                <InsertionIndicator color={color} />
              </div>
            )}

            {/* Bottom add button */}
            {canAdd && !readOnly && addPhase.kind === 'none' && activeTasks.length > 0 && (
              <button
                onClick={startAdding}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 mt-0.5 text-[#6b6b8a] hover:text-[#e8e8f0] hover:bg-[#1e1e2e]/30 transition-colors text-xs rounded-lg active:scale-[0.98] border border-dashed border-[#1e1e2e] hover:border-[#6b6b8a]"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                追加
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
