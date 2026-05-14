'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Category, Task, TaskCompletion, TaskWithCompletions, CategoryWithTasks, OwnerType } from '@/types'

export function useTasks(currentUserId: string, partnerId: string) {
  const supabase = useMemo(() => createClient(), [])
  const [categories, setCategories] = useState<CategoryWithTasks[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    const [catRes, taskRes, compRes] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('tasks').select('*').order('sort_order'),
      supabase.from('task_completions').select('*'),
    ])

    const cats: Category[] = catRes.data ?? []
    const tasks: Task[] = taskRes.data ?? []
    const completions: TaskCompletion[] = compRes.data ?? []

    const enrichedTasks: TaskWithCompletions[] = tasks.map((task) => {
      const taskCompletions = completions.filter((c) => c.task_id === task.id)
      const mineComp = taskCompletions.find((c) => c.user_id === currentUserId)
      const partnerComp = taskCompletions.find((c) => c.user_id === partnerId)
      const isCompleted =
        task.owner_type === 'shared'
          ? !!mineComp && !!partnerComp
          : !!mineComp || !!partnerComp

      const cat = cats.find((c) => c.id === task.category_id)

      return {
        ...task,
        category: cat!,
        completions: taskCompletions,
        is_mine_completed: !!mineComp,
        is_partner_completed: !!partnerComp,
        is_completed: isCompleted,
      }
    })

    const categoriesWithTasks: CategoryWithTasks[] = cats.map((cat) => ({
      ...cat,
      tasks: enrichedTasks.filter((t) => t.category_id === cat.id),
    }))

    setCategories(categoriesWithTasks)
    setLoading(false)
  }, [currentUserId, partnerId, supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('tasks-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_completions' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, fetchData)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase, fetchData])

  const createTask = async (data: {
    title: string
    description?: string
    category_id: string
    owner_type: OwnerType
    due_date?: string
    notify_start_date?: string
    notify_end_date?: string
    sort_order?: number
  }) => {
    const maxOrder = Math.max(0, ...categories.flatMap((c) => c.tasks).map((t) => t.sort_order))
    const { error } = await supabase.from('tasks').insert({
      ...data,
      created_by: currentUserId,
      sort_order: data.sort_order ?? maxOrder + 1000,
    })
    if (error) console.error('[createTask] insert failed:', error)
    else fetchData()
    return { error }
  }

  const updateTask = async (taskId: string, data: Partial<Task>) => {
    const { error } = await supabase.from('tasks').update(data).eq('id', taskId)
    if (!error) fetchData()
    return { error }
  }

  const deleteTask = async (taskId: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId)
    if (!error) fetchData()
    return { error }
  }

  const toggleCompletion = async (taskId: string, userId: string, isCompleted: boolean) => {
    if (isCompleted) {
      await supabase.from('task_completions').delete().eq('task_id', taskId).eq('user_id', userId)
    } else {
      await supabase.from('task_completions').insert({ task_id: taskId, user_id: userId })
    }
    fetchData()
  }

  const createCategory = async (data: { name: string; color: string; owner_type: OwnerType }) => {
    const maxOrder = Math.max(0, ...categories.map((c) => c.sort_order))
    const { error } = await supabase.from('categories').insert({
      ...data,
      created_by: currentUserId,
      sort_order: maxOrder + 1000,
    })
    if (error) console.error('[createCategory] insert failed:', error)
    else fetchData()
    return { error }
  }

  const deleteCategory = async (categoryId: string) => {
    const { error } = await supabase.from('categories').delete().eq('id', categoryId)
    if (error) console.error('[deleteCategory] failed:', error)
    else fetchData()
    return { error }
  }

  const updateCategoryOrder = async (catId: string, sortOrder: number) => {
    await supabase.from('categories').update({ sort_order: sortOrder }).eq('id', catId)
  }

  const updateTaskOrder = async (taskId: string, sortOrder: number, categoryId?: string) => {
    const updates: Partial<Task> = { sort_order: sortOrder }
    if (categoryId) updates.category_id = categoryId
    await supabase.from('tasks').update(updates).eq('id', taskId)
  }

  return {
    categories,
    loading,
    refetch: fetchData,
    createTask,
    updateTask,
    deleteTask,
    toggleCompletion,
    createCategory,
    deleteCategory,
    updateCategoryOrder,
    updateTaskOrder,
  }
}
