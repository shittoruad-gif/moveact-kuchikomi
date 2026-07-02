import { useState, useEffect } from 'react'
import { Copy, Check, ExternalLink, AlertTriangle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { validateReviewContent } from '../../shared/contentValidator'

interface ReviewResultProps {
  variations: string[]
  googleMapsUrl: string
  // 実際に投稿されるテキスト（編集後）を受け取って履歴に保存する
  onGoogleMapsOpen: (postedText: string) => void
}

export function ReviewResult({ variations, googleMapsUrl, onGoogleMapsOpen }: ReviewResultProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [editedText, setEditedText] = useState(variations[0])
  const [copied, setCopied] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [validation, setValidation] = useState(() => validateReviewContent(variations[0]))

  useEffect(() => {
    setEditedText(variations[selectedIndex])
    setValidation(validateReviewContent(variations[selectedIndex]))
  }, [selectedIndex, variations])

  useEffect(() => {
    setValidation(validateReviewContent(editedText))
  }, [editedText])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editedText)
      setCopied(true)
      toast.success('口コミをコピーしました')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('コピーに失敗しました。手動で選択してコピーしてください')
    }
  }

  const handleGoogleMapsClick = () => {
    // 投稿前に再度バリデーション（生成後と投稿時の2回チェック）
    const result = validateReviewContent(editedText)
    if (!result.isValid) {
      toast.error('禁止キーワードが含まれています。修正してから投稿してください。')
      return
    }
    setShowConfirmDialog(true)
  }

  const handleConfirm = () => {
    setShowConfirmDialog(false)
    onGoogleMapsOpen(editedText)
    // ポップアップブロック時は同一タブ遷移でフォールバック
    const win = window.open(googleMapsUrl, '_blank')
    if (!win) {
      window.location.href = googleMapsUrl
    }
  }

  return (
    <div className="paper-card p-5 mb-5 text-left">
      <h2 className="font-serif font-bold text-lg text-ink mb-3">生成された口コミ</h2>

      {/* Variation selector（履歴からの読み込み時など1案のみの場合は表示しない） */}
      {variations.length > 1 && (
        <div className="space-y-2 mb-4">
          {variations.map((v, i) => (
            <button
              key={i}
              onClick={() => setSelectedIndex(i)}
              className={`w-full text-left p-3 rounded-lg border transition-all text-sm ${
                selectedIndex === i
                  ? 'border-primary bg-primary/5'
                  : 'border-line hover:border-primary/40'
              }`}
            >
              <span className="font-serif font-medium text-primary">案 {i + 1}</span>
              <p className="text-ink-soft mt-1 line-clamp-2">{v.slice(0, 80)}...</p>
            </button>
          ))}
        </div>
      )}

      {/* Editor */}
      <div className="mb-3">
        <label className="block text-sm font-medium text-ink mb-1">
          口コミを編集（自由に修正できます）
        </label>
        <textarea
          value={editedText}
          onChange={(e) => setEditedText(e.target.value)}
          className="w-full border border-line rounded-lg px-3 py-2 text-sm resize-none bg-surface"
          rows={8}
        />
        <p className="text-xs text-ink-soft mt-1">{editedText.length}文字</p>
      </div>

      {/* Validation messages */}
      {validation.errors.length > 0 && (
        <div className="bg-danger-soft border-l-2 border-danger rounded-r-md p-3 mb-3">
          {validation.errors.map((err, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-danger">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{err}</span>
            </div>
          ))}
        </div>
      )}
      {validation.warnings.length > 0 && (
        <div className="bg-warn-soft border-l-2 border-warn rounded-r-md p-3 mb-3">
          {validation.warnings.map((warn, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-warn">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{warn}</span>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleCopy}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg border border-line text-ink font-medium hover:border-primary/40 hover:bg-primary/5 transition-all"
        >
          {copied ? <Check className="w-5 h-5 text-primary" /> : <Copy className="w-5 h-5" />}
          {copied ? 'コピーしました！' : '口コミをコピー'}
        </button>
        <button
          onClick={handleGoogleMapsClick}
          disabled={!validation.isValid}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-primary text-white font-medium hover:bg-primary-light transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none shadow-[3px_3px_0_0_var(--color-ink)] active:shadow-none active:translate-x-[3px] active:translate-y-[3px]"
        >
          <ExternalLink className="w-5 h-5" />
          Google マップで投稿する
        </button>
      </div>

      {/* Confirm dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-line rounded-lg p-6 max-w-md w-full shadow-[5px_5px_0_0_var(--color-ink)]">
            <h3 className="font-serif font-bold text-lg text-ink mb-3">投稿前の最終確認</h3>
            <ul className="text-sm text-ink space-y-1.5 mb-3 list-disc pl-5 marker:text-ink-soft">
              <li>この口コミは実際の体験に基づいていますか？</li>
              <li>虚偽の情報は含まれていませんか？</li>
              <li>法的責任は投稿者本人に帰属することを理解していますか？</li>
            </ul>
            <p className="text-sm text-ink-soft mb-4">
              すべて「はい」の場合のみお進みください。口コミをコピーのうえ、Google マップの投稿欄に貼り付けて投稿してください。
            </p>
            {validation.warnings.length > 0 && (
              <div className="bg-warn-soft border-l-2 border-warn rounded-r-md p-3 mb-4 text-sm text-warn">
                注意が必要な表現があります。内容をご確認のうえ投稿してください。
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="flex-1 px-4 py-2 border border-line rounded-lg text-ink font-medium hover:bg-paper"
              >
                キャンセル
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-light"
              >
                はい、投稿画面を開く
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
