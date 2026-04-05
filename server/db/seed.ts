import mysql from 'mysql2/promise'
import { drizzle } from 'drizzle-orm/mysql2'
import * as schema from './schema'

async function seed() {
  const pool = mysql.createPool(process.env.DATABASE_URL!)
  const db = drizzle(pool, { schema, mode: 'default' })

  // Seed stores
  const existingStores = await db.select().from(schema.stores)
  if (existingStores.length === 0) {
    await db.insert(schema.stores).values([
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
    ])
    console.log('Stores seeded.')
  }

  // Seed menus
  const existingMenus = await db.select().from(schema.menus)
  if (existingMenus.length === 0) {
    await db.insert(schema.menus).values([
      { name: '整体', slug: 'seitai', description: '骨格・筋肉のバランスを整える施術' },
      { name: '美容鍼', slug: 'biyoubari', description: '美容目的の鍼施術' },
      { name: 'ピラティス', slug: 'pilates', description: '体幹トレーニング' },
      { name: '鍼灸', slug: 'shinkyu', description: '鍼と灸を使った伝統的な施術' },
      { name: 'リンパマッサージ', slug: 'lymph-massage', description: 'リンパの流れを改善するマッサージ' },
      { name: 'ヘッドスパ', slug: 'head-spa', description: '頭皮のケアとリラクゼーション' },
      { name: '産後ケア', slug: 'sango-care', description: '産後の体のケアと回復サポート' },
      { name: 'スポーツ整体', slug: 'sports-seitai', description: 'スポーツ障害・パフォーマンス向上' },
    ])
    console.log('Menus seeded.')
  }

  console.log('Seed complete.')
  await pool.end()
  process.exit(0)
}

seed()
