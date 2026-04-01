import { useState, useEffect } from 'react'
import { AlertTriangle, ExternalLink } from 'lucide-react'

export function LineBrowserWarning() {
  const [isLineBrowser, setIsLineBrowser] = useState(false)

  useEffect(() => {
    setIsLineBrowser(/Line/i.test(navigator.userAgent))
  }, [])

  if (!isLineBrowser) return null

  return (
    <div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-4 mb-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-6 h-6 text-yellow-600 shrink-0 mt-0.5" />
        <div className="text-left">
          <p className="font-bold text-yellow-800 text-lg">LINEアプリ内ブラウザでは正常に動作しない場合があります</p>
          <p className="text-yellow-700 mt-1">
            右上の <ExternalLink className="w-4 h-4 inline" /> メニューから「外部ブラウザで開く」を選択してください。
          </p>
        </div>
      </div>
    </div>
  )
}
