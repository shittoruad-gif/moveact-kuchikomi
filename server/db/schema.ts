import { mysqlTable, varchar, int, text, datetime, tinyint } from 'drizzle-orm/mysql-core'
import { sql } from 'drizzle-orm'

export const stores = mysqlTable('stores', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  address: text('address').notNull(),
  area: varchar('area', { length: 255 }).notNull(),
  googleMapsUrl: text('google_maps_url').notNull(),
  createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
})

export const menus = mysqlTable('menus', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  description: text('description').notNull(),
  createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
})

export const reviews = mysqlTable('reviews', {
  id: int('id').primaryKey().autoincrement(),
  userId: varchar('user_id', { length: 255 }),
  storeId: int('store_id').notNull().references(() => stores.id),
  menuId: int('menu_id').notNull().references(() => menus.id),
  content: text('content').notNull(),
  createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
})

export const reviewHistory = mysqlTable('review_history', {
  id: int('id').primaryKey().autoincrement(),
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
