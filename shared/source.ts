/**
 * お客様がどこからアプリを開いたか。URL の ?via= で受け取る。
 *
 *   ?via=qr      … 店頭のQRコード
 *   ?via=thanks  … 来店後のお礼メッセージ（LINE・予約システム・メール）
 *   付いていない … direct（URLを直接開いた・不明）
 *
 * 月次レポートで「お礼メッセージから何件」をお店に見せるために記録する。
 * 決まった値以外は direct にまとめる（勝手な文字列をDBに入れない）。
 */
export const SOURCES = ['qr', 'thanks', 'direct'] as const
export type Source = (typeof SOURCES)[number]

export const SOURCE_LABELS: Record<Source, string> = {
  qr: '店頭のQRコード',
  thanks: 'お礼メッセージ',
  direct: 'その他（直接開いた等）',
}

export function normalizeSource(v: string | null | undefined): Source {
  return (SOURCES as readonly string[]).includes(v ?? '') ? (v as Source) : 'direct'
}
