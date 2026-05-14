'use client'

import { useState, useRef, useEffect } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useTasks } from '@/hooks/useTasks'
import KanbanColumn from './KanbanColumn'
import TaskCard from './TaskCard'
import SharedTaskCard from './SharedTaskCard'
import TaskModal from './TaskModal'
import type { User, Task, TaskWithCompletions, OwnerType } from '@/types'

type TopTab = 'mine' | 'shared' | 'partner'

interface Props {
  currentUser: User
  partner: User | null
}

function SortableCol({
  catId, disabled, width, children,
}: {
  catId: string
  disabled?: boolean
  width: string
  children: (handle: React.HTMLAttributes<HTMLElement>) => React.ReactNode
}) {
  const { setNodeRef, transform, transition, attributes, listeners } = useSortable({
    id: `cat-${catId}`,
    disabled,
  })
  return (
    <div
      ref={setNodeRef}
      className="flex-shrink-0 h-full"
      style={{ width, scrollSnapAlign: 'start', transform: CSS.Transform.toString(transform), transition }}
    >
      {children(disabled ? {} : { ...attributes, ...listeners })}
    </div>
  )
}

function isNotifyActive(task: TaskWithCompletions): boolean {
  if (!task.notify_start_date) return false
  const today = new Date().toISOString().split('T')[0]
  if (task.notify_start_date > today) return false
  if (task.owner_type === 'shared') {
    if (task.is_mine_completed && task.is_partner_completed) return false
  } else {
    if (task.is_completed) return false
  }
  if (task.due_date) {
    const cutoff = new Date(task.due_date)
    cutoff.setDate(cutoff.getDate() + 7)
    if (new Date(today) > cutoff) return false
  }
  if (task.notify_end_date && task.notify_end_date < today) return false
  return true
}

// Tab button that also acts as a drop target during drag — hovering switches the tab
function TabDropTarget({
  tabKey, label, color, isActive, isDragging, onActivate,
}: {
  tabKey: TopTab; label: string; color: string; isActive: boolean; isDragging: boolean; onActivate: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `tab-${tabKey}` })

  // Switch tab immediately when dragging over it
  useEffect(() => {
    if (isOver && isDragging) onActivate()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOver, isDragging])

  return (
    <button
      ref={setNodeRef}
      onClick={onActivate}
      className={`flex-1 py-3 text-sm font-medium transition-colors relative
        ${isActive ? 'text-[#e8e8f0]' : 'text-[#6b6b8a] hover:text-[#a0a0b8]'}
        ${isDragging && isOver ? 'bg-[#1e1e2e]/60' : ''}`}
    >
      {label}
      <div
        className={`absolute bottom-0 left-0 right-0 h-0.5 transition-all ${
          isDragging && isOver ? 'animate-pulse' : ''
        } ${!isActive && !(isDragging && isOver) ? 'opacity-0' : ''}`}
        style={{ backgroundColor: color }}
      />
    </button>
  )
}

export default function Dashboard({ currentUser, partner }: Props) {
  const {
    categories, loading, refetch,
    createTask, updateTask, deleteTask,
    toggleCompletion, createCategory, updateCategory, deleteCategory, updateCategoryOrder,
  } = useTasks(currentUser.id, partner?.id ?? '')

  const boardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = boardRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (e.deltaX !== 0) return
      if (e.deltaY === 0) return
      if ((e.target as HTMLElement).closest('[data-scroll="column"]')) return
      e.preventDefault()
      el.scrollLeft += e.deltaY
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const [activeTop, setActiveTop] = useState<TopTab>('mine')
  const [activeId, setActiveId]   = useState<string | null>(null)
  const [activeCatId, setActiveCatId] = useState<string | null>(null)
  const [insertInfo, setInsertInfo] = useState<{ columnId: string; insertBeforeId: string | null } | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingTask, setEditingTask]     = useState<TaskWithCompletions | null>(null)
  const [defaultOwnerType, setDefaultOwnerType] = useState<OwnerType>('mine')
  const [defaultCategoryId, setDefaultCategoryId] = useState('')
  const [lockedOwnerType, setLockedOwnerType]   = useState<OwnerType | undefined>()

  const [newListOwnerType, setNewListOwnerType] = useState<OwnerType>('mine')
  const [newListName, setNewListName] = useState('')
  const [newListOpen, setNewListOpen] = useState(false)
  const [creatingList, setCreatingList] = useState(false)
  const [newListError, setNewListError] = useState('')

  const partnerName = partner?.display_name || '友人'
  // Absolute identity colors from DB — same for all viewers
  const mineColor    = currentUser.color ?? '#39ff14'
  const partnerColor = partner?.color ?? '#7c3aed'
  const sharedColor  = '#00d4ff'

  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => { setIsMobile(window.innerWidth < 768) }, [])
  const colW = isMobile ? 'calc(50vw - 10px)' : '272px'
  const colSnap = { width: colW, scrollSnapAlign: 'start' as const }

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,  { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const mineCats    = categories.filter((c) => c.created_by === currentUser.id && c.owner_type === 'mine')
  const sharedCats  = categories.filter((c) => c.owner_type === 'shared')
  const partnerCats = categories.filter((c) => partner && c.created_by === partner.id && c.owner_type === 'mine')

  const topTabs: { key: TopTab; label: string; color: string }[] = [
    { key: 'mine',    label: currentUser.display_name || 'あなた', color: mineColor },
    { key: 'shared',  label: '共通',                               color: sharedColor },
    { key: 'partner', label: partnerName,                          color: partnerColor },
  ]

  const isPartnerTab = activeTop === 'partner'

  const notifySrcCats =
    activeTop === 'mine'   ? mineCats :
    activeTop === 'shared' ? sharedCats :
                             partnerCats
  const notifyTasks = notifySrcCats.flatMap((c) => c.tasks).filter(isNotifyActive)

  const openCreateModal = (ownerType: OwnerType, categoryId = '') => {
    setDefaultOwnerType(ownerType)
    setDefaultCategoryId(categoryId)
    setLockedOwnerType(ownerType)
    setEditingTask(null)
    setModalOpen(true)
  }

  const openEditModal = (task: TaskWithCompletions) => {
    setLockedOwnerType(undefined)
    setEditingTask(task)
    setModalOpen(true)
  }

  const handleQuickAdd = async (title: string, categoryId: string, ownerType: OwnerType, sortOrder?: number, dueDate?: string, description?: string, notifyStart?: string, notifyEnd?: string) => {
    const { error } = await createTask({
      title, category_id: categoryId, owner_type: ownerType, sort_order: sortOrder,
      due_date: dueDate || undefined,
      description: description || undefined,
      notify_start_date: notifyStart || undefined,
      notify_end_date: notifyEnd || undefined,
    })
    return { error }
  }

  // ── DnD handlers ─────────────────────────────────────────────
  const handleDragStart = ({ active }: DragStartEvent) => {
    const id = active.id as string
    if (id.startsWith('cat-')) {
      setActiveCatId(id.slice(4))
    } else {
      setActiveId(id)
    }
    setInsertInfo(null)
  }

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if ((active.id as string).startsWith('cat-')) return
    if (!over) { setInsertInfo(null); return }

    const dragId = active.id as string
    const overId = over.id as string

    // Tab droppable — tab switch is handled by TabDropTarget's useEffect; clear insert position
    if (overId.startsWith('tab-')) { setInsertInfo(null); return }

    // Hovering over a column droppable (empty area)
    if (overId.startsWith('col-')) {
      setInsertInfo({ columnId: overId.slice(4), insertBeforeId: null })
      return
    }

    // Hovering over a task card
    const targetCat = categories.find((c) => c.tasks.some((t) => t.id === overId))
    if (!targetCat) { setInsertInfo(null); return }

    // Ignore hovering over the dragged card itself in same column — keep previous insertInfo
    if (overId === dragId) return

    const activeTasks = targetCat.tasks.filter((t) => !t.is_completed).sort((a, b) => a.sort_order - b.sort_order)
    const overIndex   = activeTasks.findIndex((t) => t.id === overId)
    const sourceCat   = categories.find((c) => c.tasks.some((t) => t.id === dragId))
    const activeIndex = sourceCat?.id === targetCat.id
      ? activeTasks.findIndex((t) => t.id === dragId)
      : -1

    let insertBeforeId: string | null
    if (activeIndex !== -1 && activeIndex < overIndex) {
      insertBeforeId = activeTasks[overIndex + 1]?.id ?? null
    } else {
      insertBeforeId = overId
    }

    setInsertInfo({ columnId: targetCat.id, insertBeforeId })
  }

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    const id = active.id as string

    // Category reorder
    if (id.startsWith('cat-')) {
      const catId = id.slice(4)
      setActiveCatId(null)
      if (!over || over.id === active.id) return
      const overId = over.id as string
      let overCatId: string
      if (overId.startsWith('cat-')) {
        overCatId = overId.slice(4)
      } else if (overId.startsWith('col-')) {
        overCatId = overId.slice(4)
      } else if (!overId.startsWith('tab-')) {
        const parentCat = categories.find((c) => c.tasks.some((t) => t.id === overId))
        if (!parentCat) return
        overCatId = parentCat.id
      } else {
        return
      }
      const currentCats =
        activeTop === 'mine' ? mineCats :
        activeTop === 'shared' ? sharedCats :
        partnerCats
      const sorted = [...currentCats].sort((a, b) => a.sort_order - b.sort_order)
      const fromIdx = sorted.findIndex((c) => c.id === catId)
      const toIdx   = sorted.findIndex((c) => c.id === overCatId)
      if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return
      const reordered = [...sorted]
      const [moved] = reordered.splice(fromIdx, 1)
      reordered.splice(toIdx, 0, moved)
      await Promise.all(reordered.map((cat, i) => updateCategoryOrder(cat.id, (i + 1) * 1000)))
      refetch()
      return
    }

    const dragId = id
    const info   = insertInfo

    setActiveId(null)
    setInsertInfo(null)
    if (!info) return

    const sourceCat  = categories.find((c) => c.tasks.some((t) => t.id === dragId))
    if (!sourceCat) return
    const activeTask = sourceCat.tasks.find((t) => t.id === dragId)
    if (!activeTask) return

    const targetCat = categories.find((c) => c.id === info.columnId)
    if (!targetCat) return

    const targetTasks = targetCat.tasks
      .filter((t) => !t.is_completed && t.id !== dragId)
      .sort((a, b) => a.sort_order - b.sort_order)

    let newSortOrder: number
    if (info.insertBeforeId === null) {
      // Append to end
      newSortOrder = targetTasks.length > 0 ? Math.max(...targetTasks.map((t) => t.sort_order)) + 1 : 1
    } else {
      const beforeIdx = targetTasks.findIndex((t) => t.id === info.insertBeforeId)
      if (beforeIdx === -1) {
        // Target not found (filtered out as dragged item) — append to end
        newSortOrder = targetTasks.length > 0 ? Math.max(...targetTasks.map((t) => t.sort_order)) + 1 : 1
      } else if (beforeIdx === 0) {
        // Insert before first task
        newSortOrder = targetTasks[0].sort_order - 1
      } else {
        // Insert between two tasks
        newSortOrder = (targetTasks[beforeIdx - 1].sort_order + targetTasks[beforeIdx].sort_order) / 2
      }
    }

    const updates: Partial<Task> = { category_id: info.columnId, sort_order: newSortOrder }
    if (sourceCat.owner_type !== targetCat.owner_type) {
      updates.owner_type = targetCat.owner_type as OwnerType
    }
    await updateTask(dragId, updates)
    refetch()
  }

  const handleDragCancel = () => {
    setActiveId(null)
    setActiveCatId(null)
    setInsertInfo(null)
  }

  const openNewList = (ownerType: OwnerType) => {
    setNewListOwnerType(ownerType)
    setNewListName('')
    setNewListOpen(true)
  }

  const createNewList = async () => {
    if (!newListName.trim()) return
    setCreatingList(true)
    setNewListError('')
    try {
      const { error } = await createCategory({ name: newListName.trim(), color: '#6b6b8a', owner_type: newListOwnerType })
      setCreatingList(false)
      if (error) {
        const msg = (error as { message?: string })?.message ?? JSON.stringify(error)
        console.error('[Dashboard] createCategory error:', error)
        setNewListError('エラー: ' + msg)
        return
      }
      setNewListOpen(false)
    } catch (e) {
      setCreatingList(false)
      console.error('[Dashboard] createNewList threw:', e)
      setNewListError('予期しないエラー: ' + String(e))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[#6b6b8a] animate-pulse">読み込み中...</div>
      </div>
    )
  }

  const activeTask = activeId ? categories.flatMap((c) => c.tasks).find((t) => t.id === activeId) : null

  const colProps = (cat: (typeof mineCats)[0], ownerType: OwnerType, readOnly: boolean) => ({
    droppableId: `col-${cat.id}`,
    title: cat.name,
    color: cat.color,
    tasks: cat.tasks,
    currentUserId: currentUser.id,
    partnerId: partner?.id ?? '',
    partnerName,
    ownerType,
    readOnly,
    canAdd: true,
    activeId,
    insertBefore: insertInfo?.columnId === cat.id ? insertInfo.insertBeforeId : undefined,
    onQuickAdd: (t: string, so?: number, dd?: string, desc?: string, ns?: string, ne?: string): Promise<{ error: unknown }> => handleQuickAdd(t, cat.id, ownerType, so, dd, desc, ns, ne),
    onAddFull: () => openCreateModal(ownerType, cat.id),
    onEditTask: openEditModal,
    onToggleCompletion: toggleCompletion,
    onRename: readOnly ? undefined : async (name: string) => { await updateCategory(cat.id, { name }) },
    onDelete: readOnly ? undefined : async () => { await deleteCategory(cat.id) },
  })

  return (
    <div className="flex flex-col h-full">
      {/* DndContext wraps tabs + board so tabs can act as drop targets */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {/* Desktop-only top tabs — droppable during drag */}
        <div className="hidden md:flex flex-shrink-0 border-b border-[#1e1e2e] bg-[#0d0d14]">
          {topTabs.map((tab) => (
            <TabDropTarget
              key={tab.key}
              tabKey={tab.key}
              label={tab.label}
              color={tab.color}
              isActive={activeTop === tab.key}
              isDragging={!!activeId}
              onActivate={() => setActiveTop(tab.key)}
            />
          ))}
        </div>

        {/* Board */}
        <div className="flex-1 overflow-hidden">
          <div
            ref={boardRef}
            className="h-full overflow-x-auto overflow-y-hidden"
            style={{ WebkitOverflowScrolling: 'touch', scrollSnapType: 'x proximity' } as React.CSSProperties}
          >
            <div className="flex gap-2 md:gap-3 px-2 md:px-4 py-2 md:py-4 h-full">

              {/* 🔔 通知中 */}
              <div
                className="flex-shrink-0 flex flex-col h-full bg-[#0d0d14] rounded-xl border border-[#1e1e2e]"
                style={{ ...colSnap, borderTopWidth: 2, borderTopColor: '#f59e0b' }}
              >
                <div className="flex-shrink-0 flex items-center gap-2 px-3 py-3 border-b border-[#1e1e2e]">
                  <span>🔔</span>
                  <h3 className="text-sm font-semibold text-amber-400">通知中</h3>
                  {notifyTasks.length > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                      {notifyTasks.length}
                    </span>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2" data-scroll="column">
                  {notifyTasks.length === 0 ? (
                    <p className="text-center text-xs text-[#6b6b8a] py-8">通知対象なし</p>
                  ) : notifyTasks.map((task) =>
                    task.owner_type === 'shared' ? (
                      <SharedTaskCard
                        key={task.id} task={task}
                        currentUserId={currentUser.id} partnerId={partner?.id ?? ''} partnerName={partnerName}
                        myColor={isPartnerTab ? partnerColor : mineColor}
                        readOnly={isPartnerTab}
                        onEdit={() => openEditModal(task)}
                        onToggleMine={() => toggleCompletion(task.id, currentUser.id, task.is_mine_completed)}
                        onTogglePartner={() => toggleCompletion(task.id, partner?.id ?? '', task.is_partner_completed)}
                      />
                    ) : (
                      <TaskCard
                        key={task.id} task={task}
                        currentUserId={currentUser.id}
                        myColor={isPartnerTab ? partnerColor : mineColor}
                        readOnly={isPartnerTab}
                        onEdit={() => openEditModal(task)}
                        onToggle={() => {
                          const isOwner = task.created_by === currentUser.id
                          toggleCompletion(task.id, isOwner ? currentUser.id : (partner?.id ?? ''), isOwner ? task.is_mine_completed : task.is_partner_completed)
                        }}
                      />
                    )
                  )}
                </div>
              </div>

              {/* えいすけタブ: 自分のカラムのみ */}
              {activeTop === 'mine' && (
                <SortableContext items={mineCats.map((c) => `cat-${c.id}`)} strategy={horizontalListSortingStrategy}>
                  {mineCats.map((cat) => (
                    <SortableCol key={cat.id} catId={cat.id} width={colW}>
                      {(handle) => <KanbanColumn {...colProps(cat, 'mine', false)} columnDragHandle={handle} />}
                    </SortableCol>
                  ))}
                </SortableContext>
              )}

              {/* 共通タブ: 共有カラムのみ */}
              {activeTop === 'shared' && (
                <SortableContext items={sharedCats.map((c) => `cat-${c.id}`)} strategy={horizontalListSortingStrategy}>
                  {sharedCats.map((cat) => (
                    <SortableCol key={cat.id} catId={cat.id} width={colW}>
                      {(handle) => <KanbanColumn {...colProps(cat, 'shared', false)} columnDragHandle={handle} />}
                    </SortableCol>
                  ))}
                </SortableContext>
              )}

              {/* 友人タブ: 読み取り専用 */}
              {activeTop === 'partner' && (
                <SortableContext items={partnerCats.map((c) => `cat-${c.id}`)} strategy={horizontalListSortingStrategy}>
                  {partnerCats.map((cat) => (
                    <SortableCol key={cat.id} catId={cat.id} disabled width={colW}>
                      {(handle) => <KanbanColumn {...colProps(cat, 'partner', true)} columnDragHandle={handle} />}
                    </SortableCol>
                  ))}
                </SortableContext>
              )}

              {/* New list buttons */}
              {activeTop === 'mine' && (
                <div className="flex-shrink-0 h-full" style={{ width: colW, scrollSnapAlign: 'start' }}>
                  <NewListBtn
                    label={`${currentUser.display_name || 'あなた'}のリストを追加`}
                    color={mineColor}
                    onClick={() => openNewList('mine')}
                  />
                </div>
              )}
              {activeTop === 'shared' && (
                <div className="flex-shrink-0 h-full" style={{ width: colW, scrollSnapAlign: 'start' }}>
                  <NewListBtn
                    label="共通リストを追加"
                    color={sharedColor}
                    onClick={() => openNewList('shared')}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Drag overlay */}
        <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
          {activeTask && (
            <div
              className="bg-[#1e1e2e] border border-[#6b6b8a] rounded-xl px-3 py-3 rotate-[1.5deg] scale-[1.03] cursor-grabbing"
              style={{ width: colW, boxShadow: '0 24px 60px rgba(0,0,0,0.6), 0 0 30px rgba(0,212,255,0.12)' }}
            >
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: activeTask.category?.color ?? '#6b6b8a' }} />
                <p className="text-sm font-medium text-[#e8e8f0] truncate">{activeTask.title}</p>
              </div>
              {activeTask.due_date && (
                <p className="text-xs text-[#6b6b8a] mt-1.5 pl-3">📅 {activeTask.due_date}</p>
              )}
              {activeTask.description && (
                <p className="text-xs text-[#6b6b8a] mt-0.5 pl-3 truncate">{activeTask.description}</p>
              )}
            </div>
          )}
          {activeCatId && (() => {
            const cat = categories.find((c) => c.id === activeCatId)
            return cat ? (
              <div
                className="bg-[#0d0d14] border-2 rounded-xl px-3 py-2.5 rotate-[1.5deg] scale-[1.03] cursor-grabbing"
                style={{ width: colW, borderColor: cat.color, boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                  <h3 className="text-sm font-semibold text-[#e8e8f0] truncate">{cat.name}</h3>
                </div>
              </div>
            ) : null
          })()}
        </DragOverlay>
      </DndContext>

      {/* Mobile-only bottom tab bar */}
      <div
        className="flex md:hidden flex-shrink-0 border-t border-[#1e1e2e] bg-[#0d0d14]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {topTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTop(tab.key)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors ${
              activeTop === tab.key ? 'text-[#e8e8f0]' : 'text-[#6b6b8a]'
            }`}
          >
            <div
              className="w-2 h-2 rounded-full transition-all"
              style={{ backgroundColor: activeTop === tab.key ? tab.color : '#2a2a3e' }}
            />
            <span className="text-[11px] font-medium">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* New list modal */}
      {newListOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setNewListOpen(false)}
        >
          <div className="w-full max-w-xs bg-[#13131a] border border-[#1e1e2e] rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-[#e8e8f0] mb-4">新しいリストを作成</h3>
            <input
              autoFocus value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createNewList()}
              placeholder="リスト名"
              className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg px-3 py-2.5 text-sm text-[#e8e8f0] placeholder-[#6b6b8a] focus:outline-none focus:border-[#00d4ff]"
            />
            {newListError && (
              <p className="text-xs text-[#ff006e] mt-2">{newListError}</p>
            )}
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setNewListOpen(false); setNewListError('') }}
                className="flex-1 py-2.5 text-sm border border-[#1e1e2e] text-[#6b6b8a] rounded-lg hover:text-[#e8e8f0] transition-colors">
                キャンセル
              </button>
              <button onClick={createNewList} disabled={creatingList || !newListName.trim()}
                className="flex-1 py-2.5 text-sm bg-[#00d4ff] text-[#0a0a0f] rounded-lg font-medium disabled:opacity-50 hover:bg-[#00d4ff]/90 transition-colors">
                {creatingList ? '作成中...' : '作成'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task modal */}
      {modalOpen && (
        <TaskModal
          task={editingTask}
          defaultOwnerType={defaultOwnerType}
          defaultCategoryId={defaultCategoryId}
          lockedOwnerType={lockedOwnerType}
          categories={categories}
          currentUserId={currentUser.id}
          onClose={() => setModalOpen(false)}
          onSave={async (data) => {
            if (editingTask) await updateTask(editingTask.id, data)
            else await createTask(data as Parameters<typeof createTask>[0])
            setModalOpen(false)
          }}
          onDelete={editingTask ? async () => { await deleteTask(editingTask.id); setModalOpen(false) } : undefined}
          onCreateCategory={createCategory}
        />
      )}
    </div>
  )
}

function NewListBtn({ label, color, onClick }: { label: string; color: string; onClick: () => void }) {
  return (
    <div className="w-full h-full">
      <button onClick={onClick}
        className="w-full h-full min-h-[200px] flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#1e1e2e] text-[#6b6b8a] hover:border-[#6b6b8a] hover:text-[#e8e8f0] transition-colors active:scale-[0.98]"
      >
        <div className="w-10 h-10 rounded-full border-2 border-dashed flex items-center justify-center" style={{ borderColor: color }}>
          <svg className="w-5 h-5" fill="none" stroke={color} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <span className="text-sm text-center px-4">{label}</span>
      </button>
    </div>
  )
}
