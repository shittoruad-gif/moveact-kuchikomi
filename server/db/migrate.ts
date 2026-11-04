/**
 * DBの形を、複数のお店を扱える形にそろえる。何度流しても同じ結果になる。
 *
 *   npm run migrate
 *
 * やること（足すだけ。既存の行は書き換えも削除もしない）:
 *   1. 無いテーブルを作る（新しく立てたDB用）
 *   2. tenants を作り、Moveact を id=1 で入れる
 *   3. stores / menus / review_history / report_deliveries に tenant_id（既定値 1）を足す
 *   4. report_deliveries の UNIQUE を (month) から (tenant_id, month) に付け替える
 *      （お店が2つになると同じ月の記録が2行要るため。消えるのは索引だけで、行は残る）
 *   5. AIで下書きを作った回数を数える generation_counts を作る
 *   6. review_history に source（どこから開いたか。既定値は空）を足す
 *   7. tenants に ended_at（解約で提供を終えた日時。既定値は空＝提供中）を足す
 *
 * サーバーの起動時に毎回呼ばれる（server/index.ts）。済んでいれば何もしない。
 * 古いコードのままでもこの後の形で動く（tenant_id は既定値で埋まる）ので、
 * 反映をやり直して古いコードに戻しても壊れない。
 */
import mysql, { type ResultSetHeader, type RowDataPacket } from 'mysql2/promise'
import { DEFAULT_TENANT_CONFIG } from '../../shared/tenantConfig'

const MOVEACT_HOSTS = 'kuchikomi.moveact.net'

export async function migrate(url: string) {
  const conn = await mysql.createConnection(url)
  const q = async (sql: string, params: unknown[] = []) =>
    (await conn.query<RowDataPacket[]>(sql, params))[0]
  const dbName = (await q('SELECT DATABASE() AS d'))[0].d as string
  const hasColumn = async (table: string, column: string) =>
    (await q(
      'SELECT 1 FROM information_schema.columns WHERE table_schema = ? AND table_name = ? AND column_name = ?',
      [dbName, table, column],
    )).length > 0
  const hasIndex = async (table: string, index: string) =>
    (await q(
      'SELECT 1 FROM information_schema.statistics WHERE table_schema = ? AND table_name = ? AND index_name = ?',
      [dbName, table, index],
    )).length > 0
  const step = (msg: string) => console.log(`[migrate] ${msg}`)

  try {
    // 1. 既存のテーブル（新しいDBのときだけ作られる）
    await q(`CREATE TABLE IF NOT EXISTS stores (
      id int NOT NULL AUTO_INCREMENT,
      name varchar(255) NOT NULL,
      slug varchar(255) NOT NULL,
      address text NOT NULL,
      area varchar(255) NOT NULL,
      google_maps_url text NOT NULL,
      created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id), UNIQUE KEY slug (slug)
    ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)
    await q(`CREATE TABLE IF NOT EXISTS menus (
      id int NOT NULL AUTO_INCREMENT,
      name varchar(255) NOT NULL,
      slug varchar(255) NOT NULL,
      description text NOT NULL,
      created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id), UNIQUE KEY slug (slug)
    ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)
    await q(`CREATE TABLE IF NOT EXISTS review_history (
      id int NOT NULL AUTO_INCREMENT,
      visitor_id varchar(255) NOT NULL,
      store_id int NOT NULL,
      store_name varchar(255) NOT NULL,
      menu_names text NOT NULL,
      review_text text NOT NULL,
      visit_date varchar(255) NOT NULL,
      agreed_to_terms tinyint NOT NULL DEFAULT '0',
      confirmed_real_experience tinyint NOT NULL DEFAULT '0',
      is_not_related tinyint NOT NULL DEFAULT '0',
      created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)
    await q(`CREATE TABLE IF NOT EXISTS report_deliveries (
      id int NOT NULL AUTO_INCREMENT,
      month varchar(7) NOT NULL,
      status varchar(16) NOT NULL DEFAULT 'pending',
      sent_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id), UNIQUE KEY month (month)
    ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)

    // 2. tenants と Moveact（id=1）
    await q(`CREATE TABLE IF NOT EXISTS tenants (
      id int NOT NULL AUTO_INCREMENT,
      slug varchar(64) NOT NULL,
      hosts text NOT NULL,
      config text NOT NULL,
      notify_code varchar(64) DEFAULT NULL,
      created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id), UNIQUE KEY slug (slug)
    ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)
    // Moveact の月次レポートは 2026-10-01 三上様指示で止めているので notify_code は入れない
    const [inserted] = await conn.query<ResultSetHeader>(
      'INSERT IGNORE INTO tenants (id, slug, hosts, config, notify_code) VALUES (1, ?, ?, ?, NULL)',
      ['moveact', MOVEACT_HOSTS, JSON.stringify(DEFAULT_TENANT_CONFIG)],
    )
    if (inserted.affectedRows) step('tenants に Moveact（id=1）を入れました')

    // 3. tenant_id
    for (const table of ['stores', 'menus', 'review_history', 'report_deliveries']) {
      if (!(await hasColumn(table, 'tenant_id'))) {
        await q(`ALTER TABLE ${table} ADD COLUMN tenant_id int NOT NULL DEFAULT 1 AFTER id`)
        step(`${table} に tenant_id を足しました`)
      }
      if (table !== 'report_deliveries' && !(await hasIndex(table, 'idx_tenant'))) {
        await q(`ALTER TABLE ${table} ADD INDEX idx_tenant (tenant_id)`)
      }
    }

    // 4. report_deliveries の UNIQUE 付け替え（新しい索引を先に作ってから古い方を外す）
    if (!(await hasIndex('report_deliveries', 'uniq_tenant_month'))) {
      await q('ALTER TABLE report_deliveries ADD UNIQUE KEY uniq_tenant_month (tenant_id, month)')
      step('report_deliveries に UNIQUE (tenant_id, month) を足しました')
    }
    if (await hasIndex('report_deliveries', 'month')) {
      await q('ALTER TABLE report_deliveries DROP INDEX `month`')
      step('report_deliveries の古い UNIQUE (month) を外しました（行はそのまま）')
    }

    // 5. 作成回数
    await q(`CREATE TABLE IF NOT EXISTS generation_counts (
      tenant_id int NOT NULL,
      month varchar(7) NOT NULL,
      count int NOT NULL DEFAULT 0,
      PRIMARY KEY (tenant_id, month)
    ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)

    // 6. どこから開いたか
    if (!(await hasColumn('review_history', 'source'))) {
      await q("ALTER TABLE review_history ADD COLUMN source varchar(16) NOT NULL DEFAULT ''")
      step('review_history に source を足しました')
    }

    // 7. 解約で提供を終えた日時
    if (!(await hasColumn('tenants', 'ended_at'))) {
      await q('ALTER TABLE tenants ADD COLUMN ended_at datetime DEFAULT NULL')
      step('tenants に ended_at を足しました')
    }

    step('完了')
  } finally {
    await conn.end()
  }
}

// `npm run migrate` で直接呼ばれたとき
if (process.argv[1] && /migrate\.ts$/.test(process.argv[1])) {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL が設定されていません')
    process.exit(1)
  }
  migrate(process.env.DATABASE_URL).then(
    () => process.exit(0),
    (e) => {
      console.error('[migrate] 失敗', e)
      process.exit(1)
    },
  )
}
