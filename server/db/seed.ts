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
        name: 'Moveact 玉島店',
        slug: 'tamashima',
        address: '岡山県倉敷市玉島',
        area: '倉敷市玉島',
        googleMapsUrl: 'https://g.page/r/CVmVfcWMKWykEBM/review',
      },
      {
        name: 'Moveact 金光店',
        slug: 'kanemitsu',
        address: '岡山県浅口市金光町',
        area: '浅口市金光町',
        googleMapsUrl: 'https://g.page/r/CZplwIaCoKfzEBM/review',
      },
    ])
    console.log('Stores seeded.')
  }

  // Seed menus
  const existingMenus = await db.select().from(schema.menus)
  if (existingMenus.length === 0) {
    await db.insert(schema.menus).values([
      { name: '整体', slug: 'seitai', description: '骨格や筋肉のバランスを整える施術' },
      { name: '美容鍼', slug: 'biyo-hari', description: '顔や体のツボに鍼を刺して美容効果を高める施術' },
      { name: '鍼灸', slug: 'shinkyu', description: '鍼と灸を用いて体の不調を改善する伝統的な施術' },
      { name: 'ピラティス', slug: 'pilates', description: '体幹を鍛え、姿勢改善やボディメイクを目指すエクササイズ' },
      { name: 'ダイエット', slug: 'diet', description: '理想的な体型を目指すダイエットプログラム' },
      { name: 'ボクササイズ', slug: 'boxercise', description: 'ボクシングの動きを取り入れたエクササイズ' },
    ])
    console.log('Menus seeded.')
  }

  console.log('Seed complete.')
  await pool.end()
  process.exit(0)
}

seed()
