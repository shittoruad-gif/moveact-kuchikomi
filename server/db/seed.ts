import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'
import path from 'path'

const sqlite = new Database(path.join(process.cwd(), 'data.db'))
sqlite.pragma('journal_mode = WAL')
const db = drizzle(sqlite, { schema })

async function seed() {
  // Create tables
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS stores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      address TEXT NOT NULL,
      area TEXT NOT NULL,
      google_maps_url TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS menus (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      store_id INTEGER NOT NULL REFERENCES stores(id),
      menu_id INTEGER NOT NULL REFERENCES menus(id),
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS review_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      visitor_id TEXT NOT NULL,
      store_id INTEGER NOT NULL,
      store_name TEXT NOT NULL,
      menu_names TEXT NOT NULL,
      review_text TEXT NOT NULL,
      visit_date TEXT NOT NULL,
      agreed_to_terms INTEGER NOT NULL DEFAULT 0,
      confirmed_real_experience INTEGER NOT NULL DEFAULT 0,
      is_not_related INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)

  // Seed stores
  const existingStores = db.select().from(schema.stores).all()
  if (existingStores.length === 0) {
    db.insert(schema.stores).values([
      {
        name: 'Moveact 下中野店',
        slug: 'shimonakano',
        address: '岡山県岡山市北区下中野',
        area: '岡山市北区下中野',
        googleMapsUrl: 'https://www.google.com/maps/place/Moveact+%E4%B8%8B%E4%B8%AD%E9%87%8E%E5%BA%97/',
      },
      {
        name: 'Moveact 津高店',
        slug: 'tsudaka',
        address: '岡山県岡山市北区津高',
        area: '岡山市北区津高',
        googleMapsUrl: 'https://www.google.com/maps/place/Moveact+%E6%B4%A5%E9%AB%98%E5%BA%97/',
      },
      {
        name: 'Moveact 岡山駅前店',
        slug: 'okayama-ekimae',
        address: '岡山県岡山市北区駅前町',
        area: '岡山市北区駅前',
        googleMapsUrl: 'https://www.google.com/maps/place/Moveact+%E5%B2%A1%E5%B1%B1%E9%A7%85%E5%89%8D%E5%BA%97/',
      },
    ]).run()
    console.log('Stores seeded.')
  }

  // Seed menus
  const existingMenus = db.select().from(schema.menus).all()
  if (existingMenus.length === 0) {
    db.insert(schema.menus).values([
      { name: '整体', slug: 'seitai', description: '骨格・筋肉のバランスを整える施術' },
      { name: '美容鍼', slug: 'biyoubari', description: '美容目的の鍼施術' },
      { name: 'ピラティス', slug: 'pilates', description: '体幹トレーニング' },
      { name: '鍼灸', slug: 'shinkyu', description: '鍼と灸を使った伝統的な施術' },
      { name: 'リンパマッサージ', slug: 'lymph-massage', description: 'リンパの流れを改善するマッサージ' },
      { name: 'ヘッドスパ', slug: 'head-spa', description: '頭皮のケアとリラクゼーション' },
      { name: '産後ケア', slug: 'sango-care', description: '産後の体のケアと回復サポート' },
      { name: 'スポーツ整体', slug: 'sports-seitai', description: 'スポーツ障害・パフォーマンス向上' },
    ]).run()
    console.log('Menus seeded.')
  }

  console.log('Seed complete.')
  process.exit(0)
}

seed()
