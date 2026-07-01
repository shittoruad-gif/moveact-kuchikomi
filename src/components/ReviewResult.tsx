import { useState, useEffect } from 'react'
import { Copy, Check, ExternalLink, AlertTriangle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { validateReviewContent } from '../../shared/contentValidator'

interface ReviewResultProps {
  variations: string[]
  googleMapsUrl: string
  onGoogleMapsOpen: () => void
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
    if (result.warnings.length > 0) {
      toast.warning('注意が必要な表現があります。内容をご確認のうえ投稿してください。')
    }
    // 最終確認ダイアログ
    const confirmed = window.confirm(
      '投稿前の最終確認です。\n\n' +
        '・この口コミは実際の体験に基づいていますか？\n' +
        '・虚偽の情報は含まれていませんか？\n' +
        '・法的責任は投稿者本人に帰属することを理解していますか？\n\n' +
        'すべて「はい」の場合のみ、OKを押してください。',
    )
    if (!confirmed) return
    setShowConfirmDialog(true)
  }

  const handleConfirm = () => {
    setShowConfirmDialog(false)
    onGoogleMapsOpen()
    // ポップアップブロック時は同一タブ遷移でフォールバック
    const win = window.open(googleMapsUrl, '_blank')
    if (!win) {
      window.location.href = googleMapsUrl
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-5 mb-4 text-left">
      <h2 className="text-lg font-bold text-gray-800 mb-3">生成された口コミ</h2>

      {/* Variation selector */}
      <div className="space-y-2 mb-4">
        {variations.map((v, i) => (
          <button
            key={i}
            onClick={() => setSelectedIndex(i)}
            className={`w-full text-left p-3 rounded-lg border-2 transition-all text-sm ${
              selectedIndex === i
                ? 'border-primary bg-primary/5'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <span className="font-medium text-primary">バリエーション {i + 1}</span>
            <p className="text-gray-600 mt-1 line-clamp-2">{v.slice(0, 80)}...</p>
          </button>
        ))}
      </div>

      {/* Editor */}
      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          口コミを編集（自由に修正できます）
        </label>
        <textarea
          value={editedText}
          onChange={(e) => setEditedText(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
          rows={8}
        />
        <p className="text-xs text-gray-500 mt-1">{editedText.length}文字</p>
      </div>

      {/* Validation messages */}
      {validation.errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
          {validation.errors.map((err, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{err}</span>
            </div>
          ))}
        </div>
      )}
      {validation.warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
          {validation.warnings.map((warn, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-yellow-700">
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
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-all"
        >
          {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
          {copied ? 'コピーしました！' : '口コミをコピー'}
        </button>
        <button
          onClick={handleGoogleMapsClick}
          disabled={!validation.isValid}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-primary text-white font-medium hover:bg-primary-light transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ExternalLink className="w-5 h-5" />
          Google マップで投稿する
        </button>
      </div>

      {/* Confirm dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-800 mb-3">Google マップを開きます</h3>
            <p className="text-sm text-gray-600 mb-2">
              口コミをコピーしてから Google マップの投稿画面に移動します。
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Google マップの投稿欄に口コミを貼り付けて投稿してください。
            </p>
            {validation.warnings.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-sm text-yellow-700">
                注意事項がありますが、投稿は可能です。
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-light"
              >
                開く
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
