# VOX//VAULT — カラオケアーカイブ

デスクトップ・スマートフォン両対応のサイバーパンク風ホログラフィックガラスモーフィズム **カラオケライブラリマネージャー**。YouTube から曲を登録し、プレイリストで整理し、お気に入り登録し、歌唱回数を毎回記録して、充実したアナリティクスダッシュボードを探索できます。

**Node + Express + PostgreSQL** バックエンドがすべてのデータを永続化し、**React + TypeScript + Vite** フロントエンド SPA を提供します。**Docker Compose** で 2 コンテナ（アプリ + DB）として動作します。

## クイックスタート（Docker）

```bash
docker compose up --build
```

その後 **http://localhost:4030** を開いてください。

- PostgreSQL は `vox-vault-db` コンテナとして自動起動し、ヘルスチェック後にアプリが起動します
- データは `vox-pg-data` Docker ボリュームに永続化されます
- 初回起動時はサンプルライブラリ（17 曲）でシードされます

登録フローで YouTube の実際の検索を有効にするには、[YouTube Data API v3](https://developers.google.com/youtube/v3) のキーを指定します：

```bash
YOUTUBE_API_KEY=your_key_here docker compose up --build
```

キーがない場合、登録フローはサンプル候補を返します。ただし UI / フロー全体は動作します。

### コンテナ更新時の注意

コードを変更してコンテナに反映するには、`up --build` だけでは古いコンテナが残る場合があります：

```bash
docker compose down && docker compose up --build
```

### データの永続化

データは Docker の名前付きボリューム（`vox-pg-data`）に保存されます。バックアップには `pg_dump` を使用します：

```bash
docker exec vox-vault-db pg_dump -U voxvault voxvault > backup.sql
```

リストア：

```bash
cat backup.sql | docker exec -i vox-vault-db psql -U voxvault voxvault
```

### 既存データの移行（SQLite → PostgreSQL）

旧バージョンの SQLite データを移行するには、アプリを起動した状態で以下を実行してエクスポートします：

```bash
curl http://localhost:4030/api/state > backend/src/migration-data.json
```

その後コンテナを再ビルドすると、初回起動時に自動インポートされます。

## ローカル開発環境

### ワンコマンド起動

```bash
npm install   # 初回のみ
npm run dev
```

Docker（バックエンド＋DB）と Vite dev server（フロントエンド）が同時に起動します。

- バックエンド API: **http://localhost:4030**
- フロントエンド HMR: **http://localhost:5173**

### 個別起動

**バックエンド（Docker）：**

```bash
docker compose up --build
```

**フロントエンド（Vite HMR）：**

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173 で HMR 付き開発サーバー起動
```

Vite は `/api` リクエストをバックエンド（デフォルト `http://localhost:3000`）にプロキシします。

```bash
VITE_API_TARGET=http://localhost:4030 npm run dev
```

### フロントエンドのビルドとテスト

```bash
cd frontend
npm run build      # tsc + vite build → dist/ に出力
npm run typecheck  # 型チェックのみ（ビルドなし）
npm test           # Vitest スモークテスト（jsdom + Testing Library）
```

## 機能

- **ライブラリ** — 高密度リスト**および**グリッドビュー；ジャンル（ボカロ / アニソン / アーティスト / ゲーム / BGM）でフィルタ、全文検索、ソート可能なカラム（タイトル / 投稿日 / 視聴数 / 歌唱数）。ジャンル列は「すべて」表示時のみ表示。
- **楽曲を登録** — 3 ステップフロー：YouTube で検索 → 候補から選択 → メタデータ確認（タイトル・アーティスト・投稿日は自動入力）、ジャンル・歌唱ボカロ（ボカロのみ）・作品名（アニメ / ゲームのみ）・フリーフォームタグ・歌える度（★1〜5）を設定 → VAULT に保存。
- **マイリスト** — リスト作成・削除、曲追加・削除、4 タイルジャンルカラーのコラージュカバー。
- **お気に入り** — スター切り替え、グリッドビュー。
- **統計** — ジャンル比率ドーナツ、月別棒グラフ、累積面グラフ、トップアーティスト棒、お気に入り率ゲージ、70 日間歌唱ヒートマップ、トップ曲、30 日間日別歌唱推移。
- **テーマ** — HOLO / NEON / ACID、サイドバーから切り替え、サーバーサイド永続化。
- **歌唱ログ** — ▶ ボタンで本日の日付付きで歌唱を記録；歌唱数クリックで履歴を表示し、個別に取り消し可能。すべてのグラフはこの履歴から計算。
- **モバイル対応** — スマートフォンではサイドバーが引き出し式ドロワーに変化、ハンバーガーメニューで開閉。リストビューは 2 行コンパクトレイアウトに自動切替。

## アーキテクチャ

```
vox-vault/
├── docker-compose.yml            # 2 サービス構成（postgres + vox-vault）
│                                   postgres: postgres:16-alpine、ヘルスチェック付き
│                                   vox-vault: マルチステージビルド、depends_on: postgres
├── backend/
│   ├── Dockerfile                # マルチステージビルド
│   │                               Stage 1: frontend/ を npm run build
│   │                               Stage 2: node:22-slim で API + dist/ 配信
│   ├── package.json
│   └── src/
│       ├── server.js             # Express REST API + 静的ホスト
│       ├── db.js                 # PostgreSQL スキーマ + クエリ（pg）
│       ├── seed.js               # 初回シード / migration-data.json 自動インポート
│       ├── migration-data.json   # SQLite からの移行データ（オプション）
│       └── youtube.js            # モック検索 / YouTube Data API v3
└── frontend/
    ├── package.json              # React 18 + Zustand + Vite + TypeScript
    ├── vite.config.ts            # /api プロキシ、dist/ 出力
    ├── vitest.config.ts          # jsdom 環境テスト設定
    ├── index.html                # エントリーポイント、フォント、キーフレーム
    └── src/
        ├── main.tsx              # React DOM マウント
        ├── App.tsx               # ルートコンポーネント、テーマ CSS 変数適用、モバイルオーバーレイ
        ├── App.test.tsx          # Vitest スモークテスト
        ├── store.ts              # Zustand グローバルストア（状態 + 全アクション）
        ├── hooks.ts              # useIsMobile（matchMedia ベース）
        ├── types.ts              # Song / Playlist / Candidate など型定義
        ├── api.ts                # fetch ラッパー（ApiError クラス）
        ├── constants.ts          # GENRES / THEMES / PRESET_VOCALS
        ├── utils.ts              # decorate() / fmtV() / ytThumb() など
        ├── icons.tsx             # SVG アイコンコンポーネント
        └── components/
            ├── Sidebar.tsx       # ナビ + テーマ切り替え + アーカイブ統計（モバイルはドロワー）
            ├── Header.tsx        # 画面タイトル + ハンバーガーメニュー（モバイル）
            ├── Background.tsx    # 装飾レイヤー（グリッド / グロー / スキャンライン）
            ├── Library.tsx       # フィルタ / 検索 / ソート ツールバー + 一覧
            ├── LibraryRow.tsx    # リストビュー 1 行（PC: グリッド / モバイル: 2 行コンパクト）
            ├── SongCard.tsx      # グリッドビュー 1 カード
            ├── RatingStars.tsx   # 1〜5 星評価（表示 / 編集）
            ├── Register.tsx      # 登録フロー ステッパー + 各ステップ
            ├── RegisterForm.tsx  # ステップ 3 メタデータ入力フォーム
            ├── Playlists.tsx     # リスト一覧 + 詳細ビュー
            ├── Favorites.tsx     # お気に入りグリッド
            ├── Stats.tsx         # アナリティクスダッシュボード（SVG チャート）
            ├── Modals.tsx        # AddToList / CreateList / UndoSing モーダル
            └── Toast.tsx         # 自動消去トースト通知
```

バックエンドが唯一のデータソースです。フロントエンドは起動時に `GET /api/state` から全データを取得し、すべての変更を API 経由で永続化します。アナリティクスはクライアントサイドで計算されます。

## REST API

| メソッド | パス | 目的 |
|---------|------|------|
| GET    | `/api/state` | 全データペイロード（曲、プレイリスト、お気に入り、設定） |
| GET    | `/api/songs` | すべての曲 |
| POST   | `/api/songs` | 曲を登録 `{title, artists[], genre, vocals[], work, tags[], rating, date, dur, views, url}` |
| DELETE | `/api/songs/:id` | 曲を削除 |
| POST   | `/api/songs/:id/play` | 歌唱を記録（+1）、本日の日付で |
| DELETE | `/api/songs/:id/sings/:singId` | 歌唱 1 件を取り消し |
| PUT    | `/api/songs/:id/rating` | 歌える度を更新 `{rating: 1-5 | null}` |
| PUT    | `/api/songs/:id/favorite` | お気に入り切り替え |
| GET    | `/api/playlists` | すべてのプレイリスト |
| POST   | `/api/playlists` | プレイリスト作成 `{name}` |
| DELETE | `/api/playlists/:id` | プレイリスト削除 |
| POST   | `/api/playlists/:id/songs` | 曲を追加 `{songId}` |
| DELETE | `/api/playlists/:id/songs/:songId` | 曲を削除 |
| PUT    | `/api/settings` | 設定を保存 `{theme}` |
| GET    | `/api/youtube/search?q=` | YouTube 候補（モックまたは実際） |

## データモデル（PostgreSQL）

- **songs** — `id BIGINT, title, artist, artists JSONB, genre, vocals JSONB, work, tags JSONB, rating, date, dur, views, plays, url, last_played, created`
- **sings** — 歌唱イベント 1 行（`id SERIAL, song_id, date`） → ヒートマップ / 日別 / トップ曲チャートのデータ源
- **favorites** — `song_id`
- **playlists** — `id BIGINT, name, en, colors JSONB` + **playlist_songs** 結合テーブル（`playlist_id, song_id, position`）
- **settings** — キー / バリュー（現在は `theme` のみ）

配列型フィールド（`artists`, `vocals`, `tags`, `colors`）は PostgreSQL の **JSONB** カラムとして格納されます。

## YouTube リアルデータの接続

`backend/src/youtube.js` には既にライブパスが実装されています：`YOUTUBE_API_KEY` を設定すると、`search.list` + `videos.list` を呼び出し、結果を候補フォーマット（タイトル、チャンネル、視聴数、投稿日、長さ、サムネイル、動画 URL）にマップします。登録フローは実際の動画 URL を保存するため、曲名クリックで実際の YouTube 動画が開きます。
