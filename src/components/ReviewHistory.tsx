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
    <div className="bg-white rounded-xl shadow-sm p-5 mb-4 text-left">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-5 h-5 text-gray-500" />
        <h2 className="text-lg font-bold text-gray-800">口コミ履歴</h2>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-800">{item.storeName}</span>
              <span className="text-xs text-gray-500">{item.visitDate}</span>
            </div>
            <p className="text-xs text-gray-500 mb-1">{item.menuNames}</p>
            <p className="text-sm text-gray-600 line-clamp-2">{item.reviewText}</p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => onLoad(item.reviewText)}
                className="flex items-center gap-1 text-xs px-3 py-1 rounded border border-brand text-brand hover:bg-indigo-50"
              >
                <ArrowUpRight className="w-3 h-3" />
                読み込む
              </button>
              <button
                onClick={() => onDelete(item.id)}
                className="flex items-center gap-1 text-xs px-3 py-1 rounded border border-red-300 text-red-600 hover:bg-red-50"
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
