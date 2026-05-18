'use client'

import { useState, useEffect } from 'react'
import type { TaskWithCompletions, CategoryWithTasks, OwnerType } from '@/types'

const ACCENT_COLORS = [
  { label: 'Cyan', value: '#00d4ff' },
  { label: 'Green', value: '#39ff14' },
  { label: 'Magenta', value: '#ff006e' },
  { label: 'Orange', value: '#ff6b00' },
  { label: 'Violet', value: '#7c3aed' },
  { label: 'Gold', value: '#ffd60a' },
]

interface Props {
  task: TaskWithCompletions | null
  defaultOwnerType: OwnerType
  defaultCategoryId?: string
  lockedOwnerType?: OwnerType
  categories: CategoryWithTasks[]
  currentUserId: string
  onClose: () => void
  onSave: (data: {
    title: string
    description?: string
    category_id: string
    owner_type: OwnerType
    due_date?: string
    notify_start_date?: string
    notify_end_date?: string
  }) => Promise<void>
  onDelete?: () => Promise<void>
  onCreateCategory: (data: { name: string; color: string; owner_type: OwnerType }) => Promise<{ error: unknown }>
}

export default function TaskModal({ task, defaultOwnerType, defaultCategoryId, lockedOwnerType, categories, currentUserId, onClose, onSave, onDelete, onCreateCategory }: Props) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [ownerType, setOwnerType] = useState<OwnerType>(lockedOwnerType ?? task?.owner_type ?? defaultOwnerType)
  const [categoryId, setCategoryId] = useState(task?.category_id ?? defaultCategoryId ?? '')
  const [dueDate, setDueDate] = useState(task?.due_date ?? '')
  const [notifyStart, setNotifyStart] = useState(task?.notify_start_date ?? '')
  const [notifyEnd, setNotifyEnd] = useState(task?.notify_end_date ?? '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [newCatMode, setNewCatMode] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatColor, setNewCatColor] = useState('#00d4ff')
  const [creatingCat, setCreatingCat] = useState(false)

  const filteredCats = categories.filter((c) => {
    if (ownerType === 'mine') return c.owner_type === 'mine' || c.created_by === currentUserId
    if (ownerType === 'partner') return c.owner_type === 'partner'
    return c.owner_type === 'shared'
  })

  useEffect(() => {
    if (!categoryId && filteredCats.length > 0) setCategoryId(filteredCats[0].id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerType])

  // Validation: notifyEnd without notifyStart is invalid; notifyStart alone is OK (no end = notify indefinitely)
  const notifyPartial = !notifyStart && !!notifyEnd
  const notifyError = notifyPartial ? '通知開始日も設定してください' : null

  const canSave = !!title.trim() && !!categoryId && !notifyPartial

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSave) return
    setSaving(true)
    await onSave({
      title: title.trim(),
      description: description.trim() || null,
      category_id: categoryId,
      owner_type: ownerType,
      due_date: dueDate || undefined,
      notify_start_date: notifyStart || undefined,
      notify_end_date: notifyEnd || undefined,
    })
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!onDelete) return
    setDeleting(true)
    await onDelete()
    setDeleting(false)
  }

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return
    setCreatingCat(true)
    const { error } = await onCreateCategory({ name: newCatName.trim(), color: newCatColor, owner_type: ownerType })
    if (!error) {
      setNewCatMode(false)
      setNewCatName('')
    }
    setCreatingCat(false)
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full md:max-w-lg bg-[#13131a] border border-[#1e1e2e] rounded-t-2xl md:rounded-2xl max-h-[90vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e2e]">
          <h2 className="font-heading font-semibold text-[#e8e8f0]">
            {task ? 'タスクを編集' : 'タスクを追加'}
          </h2>
          <button onClick={onClose} className="text-[#6b6b8a] hover:text-[#e8e8f0] transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4">
          {/* タイトル */}
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="タスクのタイトル"
              autoFocus
              className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg px-4 py-3 text-[#e8e8f0] placeholder-[#6b6b8a] focus:outline-none focus:border-[#00d4ff] transition-colors font-medium"
            />
          </div>

          {/* 説明 */}
          <div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="説明（任意）"
              rows={2}
              className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg px-4 py-3 text-sm text-[#e8e8f0] placeholder-[#6b6b8a] focus:outline-none focus:border-[#00d4ff] transition-colors resize-none"
            />
          </div>

          {/* オーナータイプ */}
          {!lockedOwnerType && (
            <div>
              <label className="block text-xs text-[#6b6b8a] mb-2">担当</label>
              <div className="flex gap-2">
                {(['mine', 'partner', 'shared'] as OwnerType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setOwnerType(type)}
                    className={`flex-1 py-2 text-xs rounded-lg border transition-colors ${
                      ownerType === type
                        ? type === 'mine'
                          ? 'bg-[#39ff14]/10 border-[#39ff14] text-[#39ff14]'
                          : type === 'partner'
                          ? 'bg-[#7c3aed]/10 border-[#7c3aed] text-[#7c3aed]'
                          : 'bg-[#00d4ff]/10 border-[#00d4ff] text-[#00d4ff]'
                        : 'border-[#1e1e2e] text-[#6b6b8a] hover:border-[#6b6b8a]'
                    }`}
                  >
                    {type === 'mine' ? '自分' : type === 'partner' ? '友人' : '共通'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* カテゴリ */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-[#6b6b8a]">カテゴリ</label>
              <button
                type="button"
                onClick={() => setNewCatMode(!newCatMode)}
                className="text-xs text-[#00d4ff] hover:underline"
              >
                {newCatMode ? 'キャンセル' : '+ 新規作成'}
              </button>
            </div>

            {newCatMode ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="カテゴリ名"
                  className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg px-3 py-2 text-sm text-[#e8e8f0] placeholder-[#6b6b8a] focus:outline-none focus:border-[#00d4ff]"
                />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#6b6b8a]">カラー</span>
                  {ACCENT_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setNewCatColor(c.value)}
                      className={`w-6 h-6 rounded-full transition-transform ${newCatColor === c.value ? 'scale-125 ring-2 ring-white/30' : ''}`}
                      style={{ backgroundColor: c.value }}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleCreateCategory}
                  disabled={creatingCat || !newCatName.trim()}
                  className="w-full bg-[#1e1e2e] rounded-lg py-2 text-sm text-[#e8e8f0] hover:bg-[#2a2a3e] transition-colors disabled:opacity-50"
                >
                  {creatingCat ? '作成中...' : 'カテゴリを作成'}
                </button>
              </div>
            ) : (
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg px-3 py-2 text-sm text-[#e8e8f0] focus:outline-none focus:border-[#00d4ff]"
              >
                <option value="">カテゴリを選択</option>
                {filteredCats.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* 期限日 */}
          <div>
            <label className="block text-xs text-[#6b6b8a] mb-2">期限日</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg px-3 py-2 text-sm text-[#e8e8f0] font-mono focus:outline-none focus:border-[#00d4ff] [color-scheme:dark]"
            />
          </div>

          {/* 通知設定 — 両方設定するか、両方空にすること */}
          <div className="rounded-xl border border-[#1e1e2e] p-3 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[#7c3aed]">🔔</span>
              <span className="text-xs font-medium text-[#e8e8f0]">通知設定</span>
              <span className="text-[10px] text-[#6b6b8a]">（終了日のみ設定は不可）</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-[#6b6b8a] mb-1">通知開始日</label>
                <input
                  type="date"
                  value={notifyStart}
                  onChange={(e) => setNotifyStart(e.target.value)}
                  className={`w-full bg-[#0a0a0f] border rounded-lg px-2 py-2 text-xs text-[#e8e8f0] font-mono focus:outline-none [color-scheme:dark] ${
                    notifyError ? 'border-[#ff006e]' : 'border-[#1e1e2e] focus:border-[#7c3aed]'
                  }`}
                />
              </div>
              <div>
                <label className="block text-[10px] text-[#6b6b8a] mb-1">通知終了日</label>
                <input
                  type="date"
                  value={notifyEnd}
                  onChange={(e) => setNotifyEnd(e.target.value)}
                  className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg px-2 py-2 text-xs text-[#e8e8f0] font-mono focus:outline-none focus:border-[#7c3aed] [color-scheme:dark]"
                />
              </div>
            </div>

            {notifyError && (
              <p className="text-[11px] text-[#ff006e]">{notifyError}</p>
            )}
            {notifyStart && notifyEnd && notifyStart > notifyEnd && (
              <p className="text-[11px] text-amber-400">開始日が終了日より後になっています</p>
            )}
          </div>

          {/* ボタン */}
          <div className="flex gap-3 pt-2">
            {onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2.5 text-sm rounded-lg border border-[#ff006e]/30 text-[#ff006e] hover:bg-[#ff006e]/10 transition-colors disabled:opacity-50"
              >
                {deleting ? '削除中...' : '削除'}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-sm rounded-lg border border-[#1e1e2e] text-[#6b6b8a] hover:text-[#e8e8f0] hover:border-[#6b6b8a] transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={saving || !canSave}
              className="flex-1 py-2.5 text-sm rounded-lg bg-[#00d4ff] text-[#0a0a0f] font-medium hover:bg-[#00d4ff]/90 transition-colors disabled:opacity-50"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
