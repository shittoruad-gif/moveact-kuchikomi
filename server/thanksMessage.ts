/**
 * 来店後のお礼メッセージに入れる文面を、お店ごとに作る。
 *
 *   npm run thanks-message -- tenants/<slug>.json
 *
 * 店頭で声をかけなくても、来店した全員に届くお礼メッセージ（LINE公式アカウントの
 * 自動メッセージ・予約システムのお礼メール・普通のメール）に一度貼っておけば、
 * お客様は帰宅後の落ち着いたときに感想を書ける。
 * リンクには ?via=thanks を付けるので、月次レポートで「お礼メッセージから何件」が分かる。
 * 店頭のQRコードは ?via=qr のURLで作る。
 *
 * 文面は「良い口コミを」ではなく「ご感想を」とお願いする。星の数・特典には触れない。
 */
import fs from 'fs'

export type ThanksInput = { brandName: string; host: string }

export function appUrl(host: string, via: 'thanks' | 'qr') {
  return `https://${host}/?via=${via}`
}

export function buildThanksMessages({ brandName, host }: ThanksInput) {
  const url = appUrl(host, 'thanks')
  return {
    line: [
      `${brandName}です。本日はご来店ありがとうございました。`,
      'お時間のあるときで構いませんので、今日のご感想をお聞かせいただけるとうれしいです（任意・1分ほどです）。',
      url,
      'いただいたお声は、これからのお店づくりに活かしてまいります。',
    ].join('\n'),
    booking: [
      '本日はご来店いただき、ありがとうございました。',
      'もしよろしければ、今日のご感想をこちらからお寄せください（任意です）。',
      url,
    ].join('\n'),
    email: [
      `件名：${brandName}より、ご来店のお礼`,
      '',
      `${brandName}です。先日はご来店いただき、ありがとうございました。`,
      '',
      'お時間のあるときで構いませんので、ご感想をお聞かせいただけるとうれしいです。',
      '1分ほどで終わります（任意です）。',
      url,
      '',
      'いただいたお声は、これからのお店づくりに活かしてまいります。',
      'またのご来店を、スタッフ一同お待ちしております。',
    ].join('\n'),
  }
}

/** お店にお渡しするときに必ず添える決まり（Googleの口コミのルール・ステマ規制） */
export const THANKS_RULES = [
  '来店したお客様全員に、同じ文面で送ってください。満足していそうな方だけに送る使い方はできません。',
  '割引・特典などのお礼を付けたり、星の数や書く内容をお願いしたりしないでください。',
  '文面は、このままお使いください（言い回しを「良い口コミを」などに変えないでください）。',
  '予約システムによっては、お礼メッセージに外部のリンクを載せられないことがあります。お使いのサービスの規約をご確認ください。',
  '店頭のQRコードは、これまでどおり一緒に使えます。',
]

export function formatForShop(input: ThanksInput): string {
  const m = buildThanksMessages(input)
  return [
    `■ ${input.brandName} 様 お礼メッセージ用の文面`,
    '',
    '【LINE公式アカウントの自動メッセージに貼る場合】',
    m.line,
    '',
    '【予約システムのお礼メールに足す場合】',
    m.booking,
    '',
    '【メールで送る場合】',
    m.email,
    '',
    '【お使いいただくときのお願い】',
    ...THANKS_RULES.map((r) => `・${r}`),
    '',
    `（社内用）店頭QRコードのURL：${appUrl(input.host, 'qr')}`,
  ].join('\n')
}

// `npm run thanks-message -- tenants/<slug>.json` で直接呼ばれたとき
if (process.argv[1] && /thanksMessage\.ts$/.test(process.argv[1])) {
  const file = process.argv[2]
  if (!file) {
    console.error('お店の JSON を指定してください（例：npm run thanks-message -- tenants/sample.json）')
    process.exit(1)
  }
  const t = JSON.parse(fs.readFileSync(file, 'utf8'))
  console.log(formatForShop({ brandName: t.config.brandName, host: t.hosts[0] }))
}
