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
    <div className="bg-white rounded-xl shadow-sm p-5 mb-4 text-left">
      <div className="flex items-center gap-2 mb-3">
        <div className="bg-brand text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">1</div>
        <h2 className="text-lg font-bold text-gray-800">店舗を選択</h2>
      </div>
      <div className="space-y-2">
        {stores.map((store) => (
          <label
            key={store.id}
            className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
              selectedStoreId === store.id
                ? 'border-brand bg-indigo-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="store"
              checked={selectedStoreId === store.id}
              onChange={() => onSelect(store.id)}
              className="accent-brand w-4 h-4"
            />
            <MapPin className="w-4 h-4 text-gray-500" />
            <div>
              <p className="font-medium text-gray-800">{store.name}</p>
              <p className="text-xs text-gray-500">{store.area}</p>
            </div>
          </label>
        ))}
      </div>
    </div>
  )
}
