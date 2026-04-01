import { Heart, RefreshCw } from 'lucide-react'

interface ThankYouCardProps {
  onReset: () => void
}

export function ThankYouCard({ onReset }: ThankYouCardProps) {
  return (
    <div className="bg-green-50 border-2 border-green-300 rounded-xl p-6 mb-6 text-center">
      <Heart className="w-12 h-12 text-green-600 mx-auto mb-3" />
      <h2 className="text-xl font-bold text-green-800 mb-2">
        口コミの投稿、ありがとうございます！
      </h2>
      <p className="text-sm text-green-700 mb-4">
        皆様の口コミが、他のお客様の参考になります。
      </p>
      <button
        onClick={onReset}
        className="flex items-center justify-center gap-2 mx-auto px-5 py-3 rounded-lg border-2 border-green-400 text-green-700 font-medium hover:bg-green-100 transition-all"
      >
        <RefreshCw className="w-4 h-4" />
        別の口コミを生成する
      </button>
    </div>
  )
}
