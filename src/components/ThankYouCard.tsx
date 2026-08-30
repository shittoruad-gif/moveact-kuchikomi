import { Heart, RefreshCw } from 'lucide-react'

interface ThankYouCardProps {
  onReset: () => void
}

export function ThankYouCard({ onReset }: ThankYouCardProps) {
  return (
    <div className="paper-card p-6 mb-6 text-center">
      <Heart className="w-10 h-10 text-primary mx-auto mb-3" />
      <h2 className="font-serif text-xl font-bold text-ink mb-2">
        口コミの投稿、ありがとうございます！
      </h2>
      <div className="bg-primary/5 border border-primary/30 rounded-lg p-3 mb-4 text-sm text-ink text-left">
        作成した口コミは<strong>コピー済み</strong>です。開いたGoogleマップの投稿欄を長押しして「ペースト（貼り付け）」すると、そのまま投稿できます。
      </div>
      <p className="text-sm text-ink-soft mb-4">
        皆様の口コミが、他のお客様の参考になります。
      </p>
      <button
        onClick={onReset}
        className="flex items-center justify-center gap-2 mx-auto px-5 py-3 rounded-lg border border-primary/40 text-primary font-medium hover:bg-primary/5 transition-all"
      >
        <RefreshCw className="w-4 h-4" />
        別の口コミを生成する
      </button>
    </div>
  )
}
