# 口コミ作成アプリ（moveact-kuchikomi）

来店したお客様が、いくつかの質問に答えるだけで、Googleマップに投稿する口コミの下書きをAIで作れるアプリです。
1つのアプリで複数のお店を動かします（開かれたドメインでお店が決まる）。

- 本番: Coolify `moveact-kuchikomi`（main への push で自動デプロイ。**反映は夜間に行う**）
- Moveact: https://kuchikomi.moveact.net
- 新しいお店: `https://<slug>.kuchikomi.s-toru.com`

## ステマ規制への対応（外さない）

- 確認チェック3つ（規約同意・実体験・店舗関係者でない）と来店日を入れるまで、入力欄が出ない
- 利用規約で、特典と引き換えの投稿・店舗の指示による投稿を禁止と明記
- 不満の評価も選べ、正直で建設的な文章を作る（良い口コミだけを集めない）
- AIには入力にない事実・断定・誇張を書かせない。投稿前に禁止表現を点検
- 投稿するのはお客様本人（アプリは下書きとコピーまで）

## 構成

| 場所 | 中身 |
|---|---|
| `src/` | 画面（React）。お店ごとの設定は `trpc.tenant.config` から読む |
| `server/` | API（Express + tRPC）。`tenant.ts` がドメインからお店を決める |
| `server/db/migrate.ts` | DBの形をそろえる（起動時に自動。足すだけ） |
| `server/db/addTenant.ts` | お店を足す（`npm run add-tenant`） |
| `server/monthlyReport.ts` | 月次レポート（毎月1日、通知ハブ経由で公式LINEへ） |
| `shared/tenantConfig.ts` | お店ごとの設定の形と既定値 |
| `shared/contentValidator.ts` | 禁止表現の点検 |
| `tenants/` | お店ごとの設定ファイル（ヒアリングから作る） |

## 手順書

- お店を足す: [docs/店舗の追加手順.md](docs/店舗の追加手順.md)
- Notionのヒアリング回答からClaudeで作る: [docs/ヒアリングから作る手順.md](docs/ヒアリングから作る手順.md)
- Notionの台帳の作り方: [docs/notion/Notionの設定手順.md](docs/notion/Notionの設定手順.md)

## 手元で動かす

```bash
cp .env.example .env   # DATABASE_URL などを入れる
npm install
npm run seed           # DBを移行し、Moveact の店舗・メニューを入れる
npm run server         # API（3001）
npm run dev            # 画面（5174）
```

`http://moveact.localhost:5174` のように `<slug>.localhost` で、お店ごとの画面を開けます。
