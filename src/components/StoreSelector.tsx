import { MapPin } from 'lucide-react'

interface Store {
  id: number
  name: string
  area: string
}

interface StoreSelectorProps {
  stores: Store[]
  selectedStoreId: number | null
  onSelect: (id: number) => void
}

export function StoreSelector({ stores, selectedStoreId, onSelect }: StoreSelectorProps) {
  return (
    <div className="paper-card p-5 mb-5 text-left">
      <div className="step-heading">
        <span className="step-index">Step 01</span>
        <h2 className="font-bold text-ink whitespace-nowrap">店舗を選択</h2>
        <span className="step-rule" />
      </div>
      <div className="grid md:grid-cols-3 gap-2">
        {stores.map((store) => (
          <label
            key={store.id}
            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
              selectedStoreId === store.id
                ? 'border-primary bg-primary/5'
                : 'border-line hover:border-primary/40'
            }`}
          >
            <input
              type="radio"
              name="store"
              checked={selectedStoreId === store.id}
              onChange={() => onSelect(store.id)}
              className="accent-primary w-4 h-4"
            />
            <MapPin className="w-4 h-4 text-ink-soft" />
            <div>
              <p className="font-medium text-ink">{store.name}</p>
              <p className="text-xs text-ink-soft">{store.area}</p>
            </div>
          </label>
        ))}
      </div>
    </div>
  )
}
