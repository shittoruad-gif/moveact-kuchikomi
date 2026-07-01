import { useState, useEffect } from 'react'
import { AlertTriangle, Copy, HelpCircle, X } from 'lucide-react'
import { toast } from 'sonner'

const DISMISS_KEY = 'moveact-line-warning-dismissed'

export function LineBrowserWarning() {
  const [isLineBrowser, setIsLineBrowser] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // LINEアプリ内ブラウザのUAトークンは "Line/13.x" 形式
    setIsLineBrowser(navigator.userAgent.toLowerCase().includes('line/'))
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1')
  }, [])

  if (!isLineBrowser || dismissed) return null

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success('URLをコピーしました。Safari / Chromeに貼り付けて開いてください')
    } catch {
      toast.error('URLのコピーに失敗しました。アドレスバーからコピーしてください')
    }
  }

  const handleHowTo = () => {
    alert(
      'LINEアプリ内ブラウザでは正常に動作しないことがあります。\n\n' +
        '【Safari / Chromeで開く方法】\n' +
        '1. 画面右下（または右上）の「…」メニューをタップ\n' +
        '2. 「他のアプリで開く」または「ブラウザで開く」を選択\n' +
        '3. Safari または Chrome を選ぶ\n\n' +
        '※ うまくいかない場合は、下の「URLをコピー」ボタンでURLをコピーし、\n' +
        '   SafariやChromeのアドレスバーに貼り付けて開いてください。',
    )
  }

  return (
    <div className="bg-surface border border-line border-l-4 border-l-warn rounded-lg p-4 mb-6 relative">
      <button
        onClick={handleDismiss}
        aria-label="閉じる"
        className="absolute top-3 right-3 text-ink-soft hover:text-ink"
      >
        <X className="w-5 h-5" />
      </button>
      <div className="flex items-start gap-3 text-left pr-6">
        <AlertTriangle className="w-6 h-6 text-warn shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-ink">
            LINEアプリ内ブラウザでは正常に動作しない可能性があります
          </p>
          <p className="text-sm text-ink-soft mt-1">
            Safari または Chrome で開き直すことをおすすめします。
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={handleHowTo}
              className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg bg-warn text-white font-medium hover:opacity-90"
            >
              <HelpCircle className="w-4 h-4" />
              開き方を確認
            </button>
            <button
              onClick={handleCopyUrl}
              className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border border-warn text-warn font-medium hover:bg-warn-soft"
            >
              <Copy className="w-4 h-4" />
              URLをコピー
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
