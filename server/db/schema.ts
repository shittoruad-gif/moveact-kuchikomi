import { mysqlTable, varchar, int, text, datetime, tinyint } from 'drizzle-orm/mysql-core'
import { sql } from 'drizzle-orm'

/**
 * 契約先（お店）。1つのアプリで複数のお店を動かすための単位。
 * どのお店かはアクセスされたドメイン（hosts）で決まる。
 * 既存の Moveact は id=1。既存テーブルの tenant_id は既定値 1 なので、
 * 移行前の行もそのまま Moveact のものとして扱われる。
 */
export const tenants = mysqlTable('tenants', {
  id: int('id').primaryKey().autoincrement(),
  slug: varchar('slug', { length: 64 }).notNull().unique(),
  /** このお店で使うドメイン。カンマ区切り（例：kuchikomi.moveact.net） */
  hosts: text('hosts').notNull(),
  /** shared/tenantConfig.ts の TenantConfig を JSON で */
  config: text('config').notNull(),
  /** しっとる通知ハブのご契約コード。空なら月次レポートは送らない */
  notifyCode: varchar('notify_code', { length: 64 }),
  createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
})

export const stores = mysqlTable('stores', {
  id: int('id').primaryKey().autoincrement(),
  tenantId: int('tenant_id').notNull().default(1),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  address: text('address').notNull(),
  area: varchar('area', { length: 255 }).notNull(),
  googleMapsUrl: text('google_maps_url').notNull(),
  createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
})

export const menus = mysqlTable('menus', {
  id: int('id').primaryKey().autoincrement(),
  tenantId: int('tenant_id').notNull().default(1),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  description: text('description').notNull(),
  createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
})

export const reviewHistory = mysqlTable('review_history', {
  id: int('id').primaryKey().autoincrement(),
  tenantId: int('tenant_id').notNull().default(1),
  visitorId: varchar('visitor_id', { length: 255 }).notNull(),
  storeId: int('store_id').notNull(),
  storeName: varchar('store_name', { length: 255 }).notNull(),
  menuNames: text('menu_names').notNull(),
  reviewText: text('review_text').notNull(),
  visitDate: varchar('visit_date', { length: 255 }).notNull(),
  agreedToTerms: tinyint('agreed_to_terms').notNull().default(0),
  confirmedRealExperience: tinyint('confirmed_real_experience').notNull().default(0),
  isNotRelated: tinyint('is_not_related').notNull().default(0),
  createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
})

/** AIで下書きを作った回数（お店・月ごと）。上限の判定と月次レポートに使う */
export const generationCounts = mysqlTable('generation_counts', {
  tenantId: int('tenant_id').notNull(),
  month: varchar('month', { length: 7 }).notNull(),
  count: int('count').notNull().default(0),
})

/** 月次レポートの送信記録。同じお店・同じ月を二度送らないための UNIQUE (tenant_id, month) を持つ。 */
export const reportDeliveries = mysqlTable('report_deliveries', {
  id: int('id').primaryKey().autoincrement(),
  tenantId: int('tenant_id').notNull().default(1),
  month: varchar('month', { length: 7 }).notNull(),
  status: varchar('status', { length: 16 }).notNull().default('pending'),
  sentAt: datetime('sent_at').notNull().default(sql`CURRENT_TIMESTAMP`),
})
