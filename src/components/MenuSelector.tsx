interface Menu {
  id: number
  name: string
  description: string
}

interface MenuSelectorProps {
  menus: Menu[]
  selectedMenuIds: number[]
  onToggle: (id: number) => void
}

export function MenuSelector({ menus, selectedMenuIds, onToggle }: MenuSelectorProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5 mb-4 text-left">
      <div className="flex items-center gap-2 mb-3">
        <div className="bg-brand text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">2</div>
        <h2 className="text-lg font-bold text-gray-800">施術メニューを選択（複数可）</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {menus.map((menu) => (
          <label
            key={menu.id}
            className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all text-sm ${
              selectedMenuIds.includes(menu.id)
                ? 'border-brand bg-indigo-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="checkbox"
              checked={selectedMenuIds.includes(menu.id)}
              onChange={() => onToggle(menu.id)}
              className="accent-brand w-4 h-4"
            />
            <span className="font-medium text-gray-800">{menu.name}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
