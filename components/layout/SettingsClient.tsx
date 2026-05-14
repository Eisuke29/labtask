'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { usePushNotification } from '@/hooks/usePushNotification'
import { COLOR_PRESETS } from '@/hooks/useUserColors'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { User } from '@/types'

interface Device {
  id: string
  device_name: string | null
  created_at: string
}

interface Props {
  user: User
  partner: User | null
  devices: Device[]
}

const COLOR_LABELS: Record<'mine' | 'shared' | 'partner', string> = {
  mine: '自分',
  shared: '共通',
  partner: '友人',
}

export default function SettingsClient({ user, partner, devices: initialDevices }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [displayName, setDisplayName] = useState(user.display_name)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [deviceName, setDeviceName] = useState('')
  const [devices, setDevices] = useState(initialDevices)
  const [myColor, setMyColor] = useState(user.color ?? '#39ff14')
  const [savingColor, setSavingColor] = useState(false)
  const [savedColor, setSavedColor] = useState(false)
  const [notifyHour, setNotifyHour] = useState(user.notify_hour ?? 7)
  const [savingHour, setSavingHour] = useState(false)
  const [savedHour, setSavedHour] = useState(false)
  const [testSending, setTestSending] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [browserTestResult, setBrowserTestResult] = useState<string | null>(null)

  const { isSupported, isSubscribed, loading: pushLoading, subscribe, unsubscribe } = usePushNotification(user.id)

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await supabase.from('users').update({ display_name: displayName }).eq('id', user.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    router.refresh()
  }

  const handleSaveColor = async () => {
    setSavingColor(true)
    await supabase.from('users').update({ color: myColor }).eq('id', user.id)
    setSavingColor(false)
    setSavedColor(true)
    setTimeout(() => setSavedColor(false), 2000)
    router.refresh()
  }

  const handleSaveHour = async () => {
    setSavingHour(true)
    await supabase.from('users').update({ notify_hour: notifyHour }).eq('id', user.id)
    setSavingHour(false)
    setSavedHour(true)
    setTimeout(() => setSavedHour(false), 2000)
  }

  const handleSubscribe = async () => {
    await subscribe(deviceName || undefined)
    const { data } = await supabase
      .from('push_subscriptions')
      .select('id, device_name, created_at')
      .eq('user_id', user.id)
    if (data) setDevices(data)
    setDeviceName('')
  }

  const handleUnsubscribe = async () => {
    await unsubscribe()
    const { data } = await supabase
      .from('push_subscriptions')
      .select('id, device_name, created_at')
      .eq('user_id', user.id)
    if (data) setDevices(data)
  }

  const handleDeleteDevice = async (deviceId: string) => {
    await supabase.from('push_subscriptions').delete().eq('id', deviceId)
    setDevices(devices.filter((d) => d.id !== deviceId))
  }

  const handleTestNotification = async () => {
    setTestSending(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/notifications/test', { method: 'POST' })
      let json: { success?: boolean; error?: string } = {}
      try { json = await res.json() } catch {}
      if (res.ok) {
        const { sent, failed } = json as { sent?: number; failed?: number }
        setTestResult(failed ? `✓ ${sent}件送信、${failed}件失敗` : `✓ テスト通知を送信しました (${sent}件)`)
      } else {
        setTestResult(`エラー: ${(json as { error?: string }).error ?? `HTTP ${res.status}`}`)
      }
    } catch (e) {
      setTestResult(`ネットワークエラー: ${String(e)}`)
    }
    setTestSending(false)
    setTimeout(() => setTestResult(null), 8000)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <h1 className="font-heading font-bold text-xl text-[#e8e8f0]">設定</h1>

      {/* プロフィール */}
      <section className="bg-[#13131a] border border-[#1e1e2e] rounded-xl p-5">
        <h2 className="font-heading font-semibold text-sm text-[#e8e8f0] mb-4">プロフィール</h2>
        <form onSubmit={handleSaveName} className="space-y-3">
          <div>
            <label className="block text-xs text-[#6b6b8a] mb-1">表示名</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg px-3 py-2 text-sm text-[#e8e8f0] focus:outline-none focus:border-[#00d4ff] transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={saving || displayName === user.display_name}
            className="w-full py-2 text-sm rounded-lg bg-[#00d4ff] text-[#0a0a0f] font-medium hover:bg-[#00d4ff]/90 disabled:opacity-50 transition-colors"
          >
            {saved ? '保存しました ✓' : saving ? '保存中...' : '保存'}
          </button>
        </form>
      </section>

      {/* 自分の色 */}
      <section className="bg-[#13131a] border border-[#1e1e2e] rounded-xl p-5">
        <h2 className="font-heading font-semibold text-sm text-[#e8e8f0] mb-1">自分の識別色</h2>
        <p className="text-xs text-[#6b6b8a] mb-4">この色はどちらのアカウントから見ても同じ色で表示されます</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {COLOR_PRESETS.map((c) => (
            <button
              key={c}
              onClick={() => setMyColor(c)}
              className={`w-8 h-8 rounded-full transition-all active:scale-90 ${
                myColor === c ? 'scale-110 ring-2 ring-white/40 ring-offset-1 ring-offset-[#13131a]' : 'opacity-70 hover:opacity-100'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
          <label className="w-8 h-8 rounded-full border-2 border-dashed border-[#3a3a52] flex items-center justify-center cursor-pointer hover:border-[#6b6b8a] transition-colors relative overflow-hidden">
            <span className="text-[#6b6b8a] text-xs">±</span>
            <input
              type="color"
              value={myColor}
              onChange={(e) => setMyColor(e.target.value)}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            />
          </label>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full border-2 border-white/20" style={{ backgroundColor: myColor }} />
          <span className="text-xs text-[#6b6b8a] font-mono">{myColor}</span>
          <button
            onClick={handleSaveColor}
            disabled={savingColor || myColor === (user.color ?? '#39ff14')}
            className="ml-auto px-4 py-1.5 text-sm rounded-lg font-medium disabled:opacity-50 transition-colors text-[#0a0a0f]"
            style={{ backgroundColor: myColor }}
          >
            {savedColor ? '✓ 保存済み' : savingColor ? '保存中...' : '保存'}
          </button>
        </div>
      </section>

      {/* パートナー */}
      <section className="bg-[#13131a] border border-[#1e1e2e] rounded-xl p-5">
        <h2 className="font-heading font-semibold text-sm text-[#e8e8f0] mb-3">ペアリング</h2>
        {partner ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: (partner.color ?? '#7c3aed') + '33', border: `1px solid ${partner.color ?? '#7c3aed'}50` }}>
              <span className="text-xs font-medium" style={{ color: partner.color ?? '#7c3aed' }}>{(partner.display_name || '?')[0]}</span>
            </div>
            <div>
              <p className="text-sm text-[#e8e8f0] font-medium">{partner.display_name}</p>
              <p className="text-xs text-[#6b6b8a]">ペアリング済み</p>
            </div>
            <div className="ml-auto">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: myColor }} />
            </div>
          </div>
        ) : (
          <p className="text-sm text-[#6b6b8a]">ペアリングされていません</p>
        )}
      </section>

      {/* プッシュ通知 */}
      <section className="bg-[#13131a] border border-[#1e1e2e] rounded-xl p-5">
        <h2 className="font-heading font-semibold text-sm text-[#e8e8f0] mb-4">プッシュ通知</h2>

        {!isSupported ? (
          <p className="text-sm text-[#6b6b8a]">このブラウザはプッシュ通知をサポートしていません</p>
        ) : (
          <div className="space-y-3">
            {!isSubscribed ? (
              <>
                <input
                  type="text"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  placeholder="デバイス名（任意）"
                  className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg px-3 py-2 text-sm text-[#e8e8f0] placeholder-[#6b6b8a] focus:outline-none focus:border-[#7c3aed] transition-colors"
                />
                <button
                  onClick={handleSubscribe}
                  disabled={pushLoading}
                  className="w-full py-2 text-sm rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-colors text-[#0a0a0f]"
                  style={{ backgroundColor: myColor }}
                >
                  {pushLoading ? '設定中...' : 'このデバイスで通知を有効化'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleUnsubscribe}
                  disabled={pushLoading}
                  className="w-full py-2 text-sm rounded-lg border border-[#ff006e]/30 text-[#ff006e] hover:bg-[#ff006e]/10 disabled:opacity-50 transition-colors"
                >
                  {pushLoading ? '処理中...' : 'このデバイスの通知を無効化'}
                </button>

                {/* テスト通知 (push経由) */}
                <button
                  onClick={handleTestNotification}
                  disabled={testSending}
                  className="w-full py-2 text-sm rounded-lg border border-[#1e1e2e] text-[#6b6b8a] hover:text-[#e8e8f0] hover:border-[#6b6b8a] disabled:opacity-50 transition-colors"
                >
                  {testSending ? '送信中...' : '🔔 プッシュ通知テスト（サーバー経由）'}
                </button>
                {/* ブラウザ直接通知テスト */}
                <div className="space-y-1.5">
                  <button
                    onClick={async () => {
                      setBrowserTestResult(null)
                      try {
                        const currentPerm = typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
                        if (currentPerm === 'denied') {
                          setBrowserTestResult('❌ 通知がブロック中。ブラウザのサイト設定から許可してください')
                          setTimeout(() => setBrowserTestResult(null), 10000)
                          return
                        }
                        if (currentPerm !== 'granted') {
                          const perm = await Notification.requestPermission()
                          if (perm !== 'granted') {
                            setBrowserTestResult(`❌ 通知を許可しませんでした（${perm}）`)
                            setTimeout(() => setBrowserTestResult(null), 10000)
                            return
                          }
                        }
                        // Direct Notification API (no service worker)
                        const n = new Notification('🔔 直接テスト', {
                          body: 'これが届けばブラウザ通知は正常です',
                        })
                        n.onerror = () => setBrowserTestResult('❌ Notification.onerror 発生（OSが拒否している可能性）')
                        setBrowserTestResult('✓ new Notification() 実行 — ポップアップが出るか確認してください')
                        setTimeout(() => setBrowserTestResult(null), 10000)
                      } catch (e) {
                        setBrowserTestResult(`❌ エラー: ${String(e)}`)
                        setTimeout(() => setBrowserTestResult(null), 10000)
                      }
                    }}
                    className="w-full py-2 text-sm rounded-lg border border-[#1e1e2e] text-[#6b6b8a] hover:text-[#e8e8f0] hover:border-[#6b6b8a] transition-colors"
                  >
                    📱 テスト①: 直接通知（SW不使用）
                  </button>
                  <button
                    onClick={async () => {
                      setBrowserTestResult(null)
                      try {
                        if (!('serviceWorker' in navigator)) {
                          setBrowserTestResult('❌ Service Worker非対応ブラウザ')
                          setTimeout(() => setBrowserTestResult(null), 10000)
                          return
                        }
                        const reg = await Promise.race([
                          navigator.serviceWorker.ready,
                          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('SW ready タイムアウト(5秒)')), 5000)),
                        ])
                        await (reg as ServiceWorkerRegistration).showNotification('🔔 SWテスト', {
                          body: 'Service Worker経由のテストです',
                        })
                        setBrowserTestResult('✓ SW経由で送信 — ポップアップが出るか確認してください')
                        setTimeout(() => setBrowserTestResult(null), 10000)
                      } catch (e) {
                        setBrowserTestResult(`❌ SWエラー: ${String(e)}`)
                        setTimeout(() => setBrowserTestResult(null), 10000)
                      }
                    }}
                    className="w-full py-2 text-sm rounded-lg border border-[#1e1e2e] text-[#6b6b8a] hover:text-[#e8e8f0] hover:border-[#6b6b8a] transition-colors"
                  >
                    📱 テスト②: SW経由通知
                  </button>
                  {browserTestResult && (
                    <p className={`text-xs text-center leading-relaxed ${browserTestResult.startsWith('✓') ? 'text-[#39ff14]' : 'text-[#ff006e]'}`}>
                      {browserTestResult}
                    </p>
                  )}
                  <p className="text-[10px] text-[#6b6b8a]">現在の通知権限: <span className="font-mono">{typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'N/A'}</span></p>
                </div>
                {testResult && (
                  <p className={`text-xs text-center ${testResult.startsWith('✓') ? 'text-[#39ff14]' : 'text-[#ff006e]'}`}>
                    {testResult}
                  </p>
                )}
                <p className="text-[10px] text-[#6b6b8a] leading-relaxed">
                  「ブラウザ直接テスト」が届いて「プッシュテスト」が届かない場合は、プッシュの購読をリセットして再登録してください
                </p>
              </>
            )}

            {devices.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-[#6b6b8a] mb-2">登録済みデバイス ({devices.length})</p>
                <div className="space-y-1.5">
                  {devices.map((device) => (
                    <div key={device.id} className="flex items-center justify-between px-3 py-2 bg-[#0a0a0f] rounded-lg">
                      <div>
                        <p className="text-xs text-[#e8e8f0]">{device.device_name ?? '名前なし'}</p>
                        <p className="text-xs text-[#6b6b8a] font-mono">
                          {format(new Date(device.created_at), 'M/d HH:mm', { locale: ja })}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteDevice(device.id)}
                        className="text-xs text-[#6b6b8a] hover:text-[#ff006e] transition-colors"
                      >
                        削除
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 通知時刻 */}
        <div className="mt-4 pt-4 border-t border-[#1e1e2e]">
          <p className="text-xs text-[#6b6b8a]">通知時刻: <span className="text-[#e8e8f0]">毎朝 07:00（日本時間）固定</span></p>
          <p className="text-[10px] text-[#6b6b8a] mt-1">通知中タスクがある場合、毎朝7時にプッシュ通知が届きます</p>
        </div>
      </section>

      {/* ログアウト */}
      <button
        onClick={handleSignOut}
        className="w-full py-3 text-sm rounded-xl border border-[#1e1e2e] text-[#6b6b8a] hover:text-[#ff006e] hover:border-[#ff006e]/30 transition-colors"
      >
        ログアウト
      </button>
    </div>
  )
}
