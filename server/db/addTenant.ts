/**
 * 新しいお店を足す。ヒアリング内容を JSON に書いて流すだけ。
 *
 *   npm run add-tenant -- tenants/sample.json            … 中身を確かめるだけ（書き込まない）
 *   npm run add-tenant -- tenants/sample.json --apply    … 書き込む
 *   本番: cat tenants/sample.json | ssh root@163.44.103.9 \
 *           'docker exec -i -w /app <コンテナ名> npx tsx server/db/addTenant.ts - --apply'
 *
 * 書き方は tenants/example.json を見る。
 * 足すだけで、既存のお店の行は書き換えない。同じ slug・同じドメインのお店が
 * もうあるときは止まる（直したいときは、三上様の了解を取ってから手で直す）。
 */
import fs from 'fs'
import mysql, { type ResultSetHeader, type RowDataPacket } from 'mysql2/promise'
import { z } from 'zod'
import { DEFAULT_TENANT_CONFIG, tenantConfigSchema } from '../../shared/tenantConfig'

const slugSchema = z.string().regex(/^[a-z0-9-]+$/, '英小文字・数字・ハイフンだけ')

const inputSchema = z.object({
  slug: slugSchema,
  hosts: z.array(z.string().min(1)).min(1),
  notifyCode: z.string().nullable().optional(),
  // 店名・フッター・業種・ロゴ文字は Moveact の値が残ると困るので必ず書かせる
  config: tenantConfigSchema
    .pick({ brandName: true, logoLetter: true, footer: true, industry: true })
    .extend({
      ogImage: z.string().optional(),
      colors: tenantConfigSchema.shape.colors.partial().optional(),
      words: tenantConfigSchema.shape.words.partial().optional(),
      options: tenantConfigSchema.shape.options.partial().optional(),
    }),
  stores: z
    .array(
      z.object({
        name: z.string().min(1),
        slug: slugSchema,
        address: z.string().min(1),
        area: z.string().min(1),
        googleMapsUrl: z.string().url(),
      }),
    )
    .min(1),
  menus: z
    .array(z.object({ name: z.string().min(1), slug: slugSchema, description: z.string() }))
    .min(1),
})

async function main() {
  const [file] = process.argv.slice(2).filter((a) => !a.startsWith('--'))
  const apply = process.argv.includes('--apply')
  if (!file) throw new Error('JSON ファイルを指定してください（例：npm run add-tenant -- tenants/sample.json）')
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL が設定されていません')

  // 「-」なら標準入力から読む（本番コンテナには tenants/ が入っていないため、ssh で流し込む）
  const input = inputSchema.parse(JSON.parse(fs.readFileSync(file === '-' ? 0 : file, 'utf8')))
  const d = DEFAULT_TENANT_CONFIG
  const c = input.config
  const config = {
    ...d,
    ogImage: '', // 画像を用意していないお店で Moveact の画像を出さない
    ...c,
    colors: { ...d.colors, ...c.colors },
    words: { ...d.words, ...c.words },
    options: { ...d.options, ...c.options },
  }
  const hosts = input.hosts.map((h) => h.trim().toLowerCase())
  // stores / menus の slug は全店で1つの UNIQUE なので、お店の slug を頭に付ける
  const prefix = (s: string) => `${input.slug}-${s}`

  const conn = await mysql.createConnection(process.env.DATABASE_URL)
  try {
    const [dupSlug] = await conn.query<RowDataPacket[]>('SELECT id FROM tenants WHERE slug = ?', [input.slug])
    if (dupSlug.length) throw new Error(`slug「${input.slug}」のお店はもうあります`)
    const [all] = await conn.query<RowDataPacket[]>('SELECT slug, hosts FROM tenants')
    for (const t of all) {
      const used = String(t.hosts).split(',').map((h: string) => h.trim().toLowerCase())
      const clash = hosts.find((h) => used.includes(h))
      if (clash) throw new Error(`ドメイン ${clash} は「${t.slug}」で使われています`)
    }

    console.log(`お店: ${input.slug}（${config.brandName}）`)
    console.log(`ドメイン: ${hosts.join(', ')}`)
    console.log(`月次レポート: ${input.notifyCode ? '送る' : '送らない（notifyCode なし）'}`)
    console.log(`店舗: ${input.stores.map((s) => s.name).join('、')}`)
    console.log(`メニュー: ${input.menus.map((m) => m.name).join('、')}`)
    if (!apply) {
      console.log('\n確認だけしました。書き込むときは --apply を付けてください。')
      return
    }

    await conn.beginTransaction()
    const [res] = await conn.query<ResultSetHeader>(
      'INSERT INTO tenants (slug, hosts, config, notify_code) VALUES (?, ?, ?, ?)',
      [input.slug, hosts.join(','), JSON.stringify(config), input.notifyCode || null],
    )
    const tenantId = res.insertId
    for (const s of input.stores) {
      await conn.query(
        'INSERT INTO stores (tenant_id, name, slug, address, area, google_maps_url) VALUES (?, ?, ?, ?, ?, ?)',
        [tenantId, s.name, prefix(s.slug), s.address, s.area, s.googleMapsUrl],
      )
    }
    for (const m of input.menus) {
      await conn.query('INSERT INTO menus (tenant_id, name, slug, description) VALUES (?, ?, ?, ?)', [
        tenantId,
        m.name,
        prefix(m.slug),
        m.description,
      ])
    }
    await conn.commit()
    console.log(`\n書き込みました（tenant_id=${tenantId}）。アプリは1分以内に新しいお店を読み込みます。`)
  } catch (e) {
    await conn.rollback().catch(() => {})
    throw e
  } finally {
    await conn.end()
  }
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e instanceof z.ZodError ? e.issues : e instanceof Error ? e.message : e)
    process.exit(1)
  },
)
