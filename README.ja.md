# VOX//VAULT — カラオケアーカイブ

デスクトップ Web 向けのサイバーパンク風ホログラフィックガラスモーフィズム **カラオケライブラリマネージャー**。Claude Design からの設計をもとに実装されています（`Vox Vault.dc.html`）。YouTube から曲を登録し、プレイリストで整理し、お気に入り登録し、歌唱回数を毎回記録して、充実したアナリティクスダッシュボードを探索できます。

このリポジトリはデザイン仕様を実動的なアプリとして実装しました：**Node + Express + SQLite** バックエンドがすべてのデータを永続化し（プロトタイプの `localStorage` を置き換え）、忠実な **vanilla-JS** フロントエンド SPA を提供します。単一の Docker コンテナで動作します。

## クイックスタート（Docker）

```bash
docker compose up --build
```

その後 **http://localhost:4030** を開いてください。データベースは初回起動時にサンプルライブラリでシードされ、`vox-data` Docker ボリュームで永続化されます。
（コンテナ内部はポート 3000 をリッスンしており、`docker-compose.yml` がホストポート **4030** にマッピングしています。）

登録フローで YouTube の実際の検索を有効にするには、[YouTube Data API v3](https://developers.google.com/youtube/v3) のキーを指定します：

```bash
YOUTUBE_API_KEY=your_key_here docker compose up --build
```

キーがない場合、登録フローはサンプル候補を返します。ただし UI / フロー全体は動作します。

### データの永続化

デフォルトでは、データベースは Docker ボリューム（`vox-data`）に保存され、コンテナの再ビルド・再起動後も保持されます。ホストフォルダにマウントしたい場合は、`docker-compose.yml` を編集してください：

```yaml
volumes:
  - ./vox-data:/app/data  # 名前付きボリュームの代わりにホストフォルダをマウント
```

その後フォルダを作成して実行します：

```bash
mkdir -p vox-data
docker compose up --build
```

SQLite データベースファイル（`vox-vault.db`）は `./vox-data/` にあり、ご使用のマシンで読み取りと移植が可能です。

## Docker なしでローカル実行

```bash
cd backend
npm install
npm start          # http://localhost:3000  （フロントエンドも提供）
```

Node 20 以上が必須です（Node 22 で開発）。

## 機能

- **ライブラリ (Library)** — 高密度リスト**および**グリッドビュー；ジャンル（ボカロ / アニソン / アーティスト / ゲーム）でフィルタ、全文検索、ソート可能なカラム（タイトル / 投稿日 / 視聴数 / 歌唱数）。ジャンル列は「すべて」表示時のみ。
- **楽曲を登録 (Register)** — 3 ステップフロー：YouTube で検索 → 候補から選択 → メタデータ確認（タイトル・アーティスト・投稿日は自動入力）、ジャンル・歌唱ボカロ（ボカロのみ）・作品名（アニメのみ）・フリーフォームタグを設定 → VAULT に保存。
- **マイリスト (Playlists)** — リスト作成・削除、曲追加・削除、4 タイルジャンルカラーのコラージュカバー。
- **お気に入り (Favorites)** — スター切り替え、グリッドビュー。
- **統計 (Analytics)** — ジャンル比率ドーナツ、月別棒グラフ、累積面グラフ、トップアーティスト棒、お気に入り率ゲージ、70 日間歌唱**ヒートマップ**、トップ曲、30 日間日別歌唱推移。
- **テーマ** — HOLO / NEON / ACID、サイドバーから切り替え、サーバーサイド永続化。
- **歌唱ログ** — ▶ ボタンで本日の日付付きで歌唱を記録；すべてのグラフはこの履歴から計算。

## アーキテクチャ

```
vox-vault/
├── docker-compose.yml        # 1 つのサービス、永続ボリューム
├── backend/
│   ├── Dockerfile            # node:22-slim、API + 静的フロントエンド配信
│   └── src/
│       ├── server.js         # Express REST API + 静的ホスト
│       ├── db.js             # SQLite スキーマ + シリアライザ（better-sqlite3）
│       ├── seed.js           # プロトタイプから移植したサンプルデータ
│       └── youtube.js        # モック検索；YOUTUBE_API_KEY 指定時は YouTube Data API v3
└── frontend/
    ├── index.html            # フォント、キーフレーム、基本スタイル
    └── app.js                # フル SPA（レンダリング + 状態管理 + API クライアント）
```

バックエンドが唯一のデータソースです；フロントエンドは起動時に `GET /api/state` から全データを取得し、すべての変更を API 経由で永続化します。アナリティクスはクライアントサイドで計算されて設計と完全に一致します。

## REST API

| メソッド | パス | 目的 |
|---------|------|------|
| GET    | `/api/state` | 全データペイロード（曲、プレイリスト、お気に入り、設定） |
| GET    | `/api/songs` | すべての曲 |
| POST   | `/api/songs` | 曲を登録 `{title, artist, genre, vocals[], work, tags[], date, dur, views, url}` |
| DELETE | `/api/songs/:id` | 曲を削除 |
| POST   | `/api/songs/:id/play` | 歌唱を記録（歌唱 +1）、本日の日付で |
| PUT    | `/api/songs/:id/favorite` | お気に入り切り替え |
| GET    | `/api/playlists` | すべてのプレイリスト |
| POST   | `/api/playlists` | プレイリスト作成 `{name}` |
| DELETE | `/api/playlists/:id` | プレイリスト削除 |
| POST   | `/api/playlists/:id/songs` | 曲を追加 `{songId}` |
| DELETE | `/api/playlists/:id/songs/:songId` | 曲を削除 |
| PUT    | `/api/settings` | 設定を保存 `{theme}` |
| GET    | `/api/youtube/search?q=` | YouTube 候補（モックまたは実際） |

## データモデル

- **songs** — `id, title, artist, genre, vocals[] (JSON), work, tags[] (JSON), date, dur, views, plays, url, last_played, created`
- **sings** — 歌唱イベント 1 行（`song_id, date`） → ヒートマップ / 日別 / トップ曲 チャートのデータ源
- **favorites** — `song_id`
- **playlists** — `id, name, en, colors[] (JSON)` + **playlist_songs** 結合テーブル（`playlist_id, song_id, position`）
- **settings** — キー / バリュー（現在は `theme` のみ）

## モバイル対応について

デザインはデスクトップファーストですが、後のモバイル対応を視野に入れて実装されています（サイドバー + メインレイアウト、レスポンシブ `auto-fill` グリッド）。レスポンシブブレークポイントの追加が次のステップです。

## YouTube リアルデータの接続

`backend/src/youtube.js` には既にライブパスが実装されています：`YOUTUBE_API_KEY` を設定すると、`search.list` + `videos.list` を呼び出し、結果を候補フォーマット（タイトル、チャンネル、視聴数、投稿日、長さ、サムネイル、動画 URL）にマップします。登録フローは実際の動画 URL を保存するため、曲名クリックで実際の YouTube 動画が開きます。
