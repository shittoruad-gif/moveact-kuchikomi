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
    <div className="paper-card p-5 mb-5 text-left">
      <div className="step-heading">
        <span className="step-index">Step {String(step).padStart(2, '0')}</span>
        <h2 className="font-bold text-ink whitespace-nowrap">{title}</h2>
        <span className="step-rule" />
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => onSelect(option)}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
              isSelected(option)
                ? 'border-primary bg-primary text-white'
                : 'border-line text-ink hover:border-primary/40 bg-surface'
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
          className="mt-3 w-full border border-line rounded-lg px-3 py-2 text-sm resize-none bg-surface"
          rows={2}
        />
      )}
    </div>
  )
}
