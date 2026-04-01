import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const stores = sqliteTable('stores', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  address: text('address').notNull(),
  area: text('area').notNull(),
  googleMapsUrl: text('google_maps_url').notNull(),
  createdAt: text('created_at').notNull().default(new Date().toISOString()),
})

export const menus = sqliteTable('menus', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description').notNull().default(''),
  createdAt: text('created_at').notNull().default(new Date().toISOString()),
})

export const reviews = sqliteTable('reviews', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id'),
  storeId: integer('store_id').notNull().references(() => stores.id),
  menuId: integer('menu_id').notNull().references(() => menus.id),
  content: text('content').notNull(),
  createdAt: text('created_at').notNull().default(new Date().toISOString()),
})

export const reviewHistory = sqliteTable('review_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  visitorId: text('visitor_id').notNull(),
  storeId: integer('store_id').notNull(),
  storeName: text('store_name').notNull(),
  menuNames: text('menu_names').notNull(),
  reviewText: text('review_text').notNull(),
  visitDate: text('visit_date').notNull(),
  agreedToTerms: integer('agreed_to_terms').notNull().default(0),
  confirmedRealExperience: integer('confirmed_real_experience').notNull().default(0),
  isNotRelated: integer('is_not_related').notNull().default(0),
  createdAt: text('created_at').notNull().default(new Date().toISOString()),
})
