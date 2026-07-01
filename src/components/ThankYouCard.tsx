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
