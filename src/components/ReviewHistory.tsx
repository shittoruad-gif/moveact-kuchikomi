import { Clock, Trash2, ArrowUpRight } from 'lucide-react'

interface HistoryItem {
  id: number
  storeName: string
  menuNames: string
  reviewText: string
  visitDate: string
  createdAt: string
}

interface ReviewHistoryProps {
  items: HistoryItem[]
  onLoad: (text: string) => void
  onDelete: (id: number) => void
}

export function ReviewHistory({ items, onLoad, onDelete }: ReviewHistoryProps) {
  if (items.length === 0) return null

  return (
    <div className="paper-card p-5 mb-5 text-left">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-5 h-5 text-ink-soft" />
        <h2 className="font-bold text-ink">口コミ履歴</h2>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="border border-line rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-ink">{item.storeName}</span>
              <span className="text-xs text-ink-soft">{item.visitDate}</span>
            </div>
            <p className="text-xs text-ink-soft mb-1">{item.menuNames}</p>
            <p className="text-sm text-ink-soft line-clamp-2">{item.reviewText}</p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => onLoad(item.reviewText)}
                className="flex items-center gap-1 text-xs px-3 py-1 rounded border border-primary text-primary hover:bg-primary/5"
              >
                <ArrowUpRight className="w-3 h-3" />
                読み込む
              </button>
              <button
                onClick={() => onDelete(item.id)}
                className="flex items-center gap-1 text-xs px-3 py-1 rounded border border-danger/40 text-danger hover:bg-danger-soft"
              >
                <Trash2 className="w-3 h-3" />
                削除
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
