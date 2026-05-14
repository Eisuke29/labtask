export type OwnerType = 'mine' | 'partner' | 'shared'

export interface User {
  id: string
  display_name: string
  color: string
  push_subscription: PushSubscriptionJSON | null
  partner_id: string | null
  notify_hour: number
  created_at: string
}

export interface Category {
  id: string
  owner_type: OwnerType
  name: string
  color: string
  sort_order: number
  created_by: string
  created_at: string
}

export interface Task {
  id: string
  category_id: string
  owner_type: OwnerType
  title: string
  description: string | null
  due_date: string | null
  notify_start_date: string | null
  notify_end_date: string | null
  sort_order: number
  created_by: string
  created_at: string
  updated_at: string
}

export interface TaskCompletion {
  id: string
  task_id: string
  user_id: string
  completed_at: string
}

export interface PushSubscriptionRecord {
  id: string
  user_id: string
  subscription: PushSubscriptionJSON
  device_name: string | null
  created_at: string
}

export interface TaskWithCategory extends Task {
  category: Category
}

export interface TaskWithCompletions extends TaskWithCategory {
  completions: TaskCompletion[]
  is_mine_completed: boolean
  is_partner_completed: boolean
  is_completed: boolean
}

export interface CategoryWithTasks extends Category {
  tasks: TaskWithCompletions[]
}

export interface PushSubscriptionJSON {
  endpoint: string
  expirationTime: number | null
  keys: {
    p256dh: string
    auth: string
  }
}
