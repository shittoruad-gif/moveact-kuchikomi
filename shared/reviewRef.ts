/**
 * 口コミのご案内リンクに付いている「予約ごとの目印」。URL の ?r= で受け取る。
 *
 * Moveact の予約システムが、来店後のご案内（LINE・メール）のリンクに付ける乱数（英数字24文字）。
 * お名前・連絡先は含まない。お客様が下書きを作ってGoogleマップへ進んだときに、
 * この目印と口コミの文章を予約システムへ知らせる（server/routers/history.ts。Googleへの投稿の確かめ用）。
 * 決まった形以外は捨てる（勝手な文字列を外へ送らない）。
 */
const REVIEW_REF_RE = /^[a-f0-9]{24}$/

export function normalizeReviewRef(v: string | null | undefined): string {
  return REVIEW_REF_RE.test(v ?? '') ? (v as string) : ''
}
