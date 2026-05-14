'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function usePushNotification(userId: string) {
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    setIsSupported('serviceWorker' in navigator && 'PushManager' in window)
    checkSubscription()
  }, [])

  const checkSubscription = async () => {
    if (!('serviceWorker' in navigator)) return
    const registration = await navigator.serviceWorker.ready
    const sub = await registration.pushManager.getSubscription()
    setIsSubscribed(!!sub)
  }

  const subscribe = async (deviceName?: string) => {
    setLoading(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      })

      const subJson = sub.toJSON()
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: subJson, device_name: deviceName }),
      })

      setIsSubscribed(true)
    } catch (err) {
      console.error('Push subscription failed:', err)
    }
    setLoading(false)
  }

  const unsubscribe = async () => {
    setLoading(true)
    const registration = await navigator.serviceWorker.ready
    const sub = await registration.pushManager.getSubscription()
    if (sub) {
      const endpoint = sub.endpoint
      await sub.unsubscribe()
      await supabase.from('push_subscriptions').delete().eq('user_id', userId).contains('subscription', { endpoint })
      setIsSubscribed(false)
    }
    setLoading(false)
  }

  return { isSupported, isSubscribed, loading, subscribe, unsubscribe }
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const arr = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i)
  return arr.buffer
}
