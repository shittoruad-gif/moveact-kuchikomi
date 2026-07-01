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
    <div className="paper-card p-5 mb-5 text-left">
      <div className="step-heading">
        <span className="step-index">Step 02</span>
        <h2 className="font-bold text-ink whitespace-nowrap">施術メニューを選択（複数可）</h2>
        <span className="step-rule" />
      </div>
      <div className="grid md:grid-cols-2 gap-2">
        {menus.map((menu) => (
          <label
            key={menu.id}
            className={`flex items-start gap-2 p-3 rounded-lg border cursor-pointer transition-all text-sm ${
              selectedMenuIds.includes(menu.id)
                ? 'border-primary bg-primary/5'
                : 'border-line hover:border-primary/40'
            }`}
          >
            <input
              type="checkbox"
              checked={selectedMenuIds.includes(menu.id)}
              onChange={() => onToggle(menu.id)}
              className="accent-primary w-4 h-4 mt-0.5 shrink-0"
            />
            <div>
              <p className="font-medium text-ink">{menu.name}</p>
              <p className="text-xs text-ink-soft mt-0.5">{menu.description}</p>
            </div>
          </label>
        ))}
      </div>
    </div>
  )
}
