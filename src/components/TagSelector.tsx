interface TagSelectorProps {
  step: number
  title: string
  options: string[]
  selected: string | string[]
  onSelect: (value: string) => void
  multiple?: boolean
  freeText?: string
  onFreeTextChange?: (value: string) => void
  freeTextPlaceholder?: string
}

export function TagSelector({
  step,
  title,
  options,
  selected,
  onSelect,
  multiple = false,
  freeText,
  onFreeTextChange,
  freeTextPlaceholder,
}: TagSelectorProps) {
  const isSelected = (option: string) =>
    multiple
      ? (selected as string[]).includes(option)
      : selected === option

  return (
    <div className="bg-white rounded-xl shadow-sm p-5 mb-4 text-left">
      <div className="flex items-center gap-2 mb-3">
        <div className="bg-brand text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">
          {step}
        </div>
        <h2 className="text-lg font-bold text-gray-800">{title}</h2>
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => onSelect(option)}
            className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-all ${
              isSelected(option)
                ? 'border-brand bg-brand text-white'
                : 'border-gray-200 text-gray-700 hover:border-gray-300 bg-white'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
      {onFreeTextChange !== undefined && (
        <textarea
          value={freeText || ''}
          onChange={(e) => onFreeTextChange(e.target.value)}
          placeholder={freeTextPlaceholder || '自由記述（任意）'}
          className="mt-3 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
          rows={2}
        />
      )}
    </div>
  )
}
