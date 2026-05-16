'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { User, TaskWithCompletions } from '@/types'

interface Props {
  currentUser: User
  partner: User | null
}

export default function CompletedList({ currentUser, partner }: Props) {
  const supabase = createClient()
  const [completedTasks, setCompletedTasks] = useState<TaskWithCompletions[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'mine' | 'partner' | 'shared'>('all')

  const fetchCompleted = useCallback(async () => {
    const [catRes, taskRes, compRes] = await Promise.all([
      supabase.from('categories').select('*'),
      supabase.from('tasks').select('*'),
      supabase.from('task_completions').select('*'),
    ])

    const cats = catRes.data ?? []
    const tasks = taskRes.data ?? []
    const completions = compRes.data ?? []

    const enriched: TaskWithCompletions[] = tasks
      .map((task) => {
        const taskCompletions = completions.filter((c) => c.task_id === task.id)
        const mineComp = taskCompletions.find((c) => c.user_id === currentUser.id)
        const partnerComp = partner ? taskCompletions.find((c) => c.user_id === partner.id) : undefined
        const isCompleted =
          task.owner_type === 'shared'
            ? !!mineComp && !!partnerComp
            : !!mineComp || !!partnerComp

        const cat = cats.find((c: { id: string }) => c.id === task.category_id)
        return {
          ...task,
          category: cat,
          completions: taskCompletions,
          is_mine_completed: !!mineComp,
          is_partner_completed: !!partnerComp,
          is_completed: isCompleted,
        }
      })
      .filter((t) => t.is_completed)
      .sort((a, b) => {
        const aTime = Math.max(...a.completions.map((c: { completed_at: string }) => new Date(c.completed_at).getTime()))
        const bTime = Math.max(...b.completions.map((c: { completed_at: string }) => new Date(c.completed_at).getTime()))
        return bTime - aTime
      })

    setCompletedTasks(enriched)
    setLoading(false)
  }, [currentUser.id, partner?.id, supabase])

  useEffect(() => { fetchCompleted() }, [fetchCompleted])

  const undoCompletion = async (taskId: string) => {
    await supabase
      .from('task_completions')
      .delete()
      .eq('task_id', taskId)
      .eq('user_id', currentUser.id)
    fetchCompleted()
  }

  const filtered = completedTasks.filter((t) => {
    if (filter === 'all') return true
    if (filter === 'shared') return t.owner_type === 'shared'
    if (filter === 'mine') return t.owner_type === 'mine' && t.created_by === currentUser.id
    return t.owner_type === 'mine' && t.created_by === partner?.id
  })

  if (loading) return <div className="flex justify-center py-20 text-[#6b6b8a]">読み込み中...</div>

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="font-heading font-bold text-xl text-[#e8e8f0] mb-4">完了済みタスク</h1>

      {/* フィルター */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {(['all', 'mine', 'partner', 'shared'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors ${
              filter === f ? 'bg-[#1e1e2e] text-[#e8e8f0] font-medium' : 'text-[#6b6b8a] hover:text-[#e8e8f0]'
            }`}
          >
            {f === 'all' ? 'すべて' : f === 'mine' ? '自分' : f === 'partner' ? '友人' : '共通'}
            <span className="ml-1 text-[#6b6b8a]">
              ({completedTasks.filter((t) => {
                if (f === 'all') return true
                if (f === 'shared') return t.owner_type === 'shared'
                if (f === 'mine') return t.owner_type === 'mine' && t.created_by === currentUser.id
                return t.owner_type === 'mine' && t.created_by === partner?.id
              }).length})
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-[#6b6b8a]">完了済みタスクはありません</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((task) => {
            const myComp = task.completions.find((c) => c.user_id === currentUser.id)
            const partnerComp = partner ? task.completions.find((c) => c.user_id === partner.id) : undefined
            const isPartnerOwned = task.owner_type === 'mine' && task.created_by === partner?.id
            const isShared = task.owner_type === 'shared'

            return (
              <div
                key={task.id}
                className="bg-[#13131a] border border-[#1e1e2e] rounded-xl px-4 py-3 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: task.category?.color ?? '#6b6b8a' }} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-[#6b6b8a] line-through truncate">{task.title}</p>
                      {isShared && (
                        <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-[#00d4ff]/10 text-[#00d4ff]">共通</span>
                      )}
                      {isPartnerOwned && (
                        <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-[#7c3aed]/10 text-[#7c3aed]">
                          {partner?.display_name || '友人'}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-0.5 mt-0.5">
                      {task.category && (
                        <span className="text-xs text-[#6b6b8a]">{task.category.name}</span>
                      )}
                      {myComp && (
                        <span className="text-xs font-mono text-[#6b6b8a]">
                          自分: {format(new Date(myComp.completed_at), 'M/d HH:mm', { locale: ja })} 完了
                        </span>
                      )}
                      {partnerComp && (
                        <span className="text-xs font-mono text-[#6b6b8a]">
                          {partner?.display_name || '友人'}: {format(new Date(partnerComp.completed_at), 'M/d HH:mm', { locale: ja })} 完了
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {myComp && (
                  <button
                    onClick={() => undoCompletion(task.id)}
                    className="flex-shrink-0 text-xs text-[#6b6b8a] hover:text-[#e8e8f0] px-2 py-1 rounded border border-[#1e1e2e] hover:border-[#6b6b8a] transition-colors"
                  >
                    取り消し
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
