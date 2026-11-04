/**
 * 店頭に置くQRコードを作る（契約書第5条第1項でお渡しするもの）。
 *
 *   npm run qr -- tenants/<slug>.json [出力フォルダ]
 *
 * QRの中身は https://<お店のアドレス>/?via=qr 。月次レポートの「店頭のQRコードから」に数えられる。
 * 印刷用に PNG（1200px 四方）と SVG を出す。
 */
import fs from 'fs'
import path from 'path'
import QRCode from 'qrcode'
import { appUrl } from './thanksMessage'

async function main() {
  const [file, outDirArg] = process.argv.slice(2)
  if (!file) throw new Error('お店の JSON を指定してください（例：npm run qr -- tenants/sample.json）')
  const t = JSON.parse(fs.readFileSync(file, 'utf8'))
  const url = appUrl(t.hosts[0], 'qr')
  const outDir = outDirArg || path.join('qr', t.slug)
  fs.mkdirSync(outDir, { recursive: true })
  const base = path.join(outDir, `${t.slug}_QR`)
  // 誤り訂正は M（店頭で少し汚れても読める）
  await QRCode.toFile(`${base}.png`, url, { width: 1200, margin: 4, errorCorrectionLevel: 'M' })
  fs.writeFileSync(`${base}.svg`, await QRCode.toString(url, { type: 'svg', margin: 4, errorCorrectionLevel: 'M' }))
  console.log(`QRの中身: ${url}`)
  console.log(`作りました: ${base}.png / ${base}.svg`)
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
