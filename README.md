# LabTask — 研究室タスク共有アプリ

2人専用のタスク管理PWA。お互いのタスクを見て補い合う。

## セットアップ手順

### 1. Supabase プロジェクト作成

1. [Supabase](https://supabase.com) でプロジェクトを作成
2. **SQL Editor** で `supabase/schema.sql` の内容を全て実行
3. **Authentication → Providers** で Google OAuth を設定（任意）
4. **Project Settings → API** から以下をコピー：
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

### 2. VAPID キー生成（Web Push 通知用）

```bash
npx web-push generate-vapid-keys
```

出力された Public Key と Private Key をそれぞれ環境変数に設定。

### 3. 環境変数設定

`.env.local.example` をコピーして `.env.local` を作成し、全ての値を設定：

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_VAPID_PUBLIC_KEY=B...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:your@email.com
CRON_SECRET=ランダムな文字列（例: openssl rand -hex 32）
```

### 4. PWA アイコン作成

`public/icons/` ディレクトリを作成し、以下のファイルを配置：
- `icon-192.png` (192×192px)
- `icon-512.png` (512×512px)

### 5. ローカル開発

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) を開く。

### 6. Vercel デプロイ

1. GitHub にプッシュ
2. [Vercel](https://vercel.com) でリポジトリをインポート
3. **Settings → Environment Variables** で全ての環境変数を設定
4. デプロイ完了後、Supabase の **Authentication → URL Configuration** に Vercel の URL を追加

### Cron ジョブ（毎朝 8:00 JST 通知）

`vercel.json` に設定済み。Vercel Pro プランが必要。  
Cron リクエストには `Authorization: Bearer {CRON_SECRET}` ヘッダーが自動付与されます。

## 使い方

### 初回ログイン

1. `/auth` でログイン（Google または Email）
2. **招待コードを発行** → 友人に共有
3. 友人が **コードで参加** → ペアリング完了

### タスク管理

- `/dashboard` — 3カラム（自分 / 友人 / 共通）でタスク管理
- カテゴリをクリックで折りたたみ
- タスクカードをドラッグ&ドロップで順序変更
- タスクカードクリックで編集モーダル
- 共通タスクは自分と友人それぞれのチェックボックスあり

### 通知設定

`/settings` → **「このデバイスで通知を有効化」** をクリック

## 技術スタック

| | |
|---|---|
| フレームワーク | Next.js 16 (App Router) |
| 言語 | TypeScript |
| DB / Auth / Realtime | Supabase |
| スタイリング | Tailwind CSS |
| ドラッグ&ドロップ | @dnd-kit |
| プッシュ通知 | Web Push API + Service Worker |
| デプロイ | Vercel |
