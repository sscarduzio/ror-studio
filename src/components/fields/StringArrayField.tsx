import { useState, useCallback } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { HighlightedText } from '@/utils/ror-variables'

interface StringArrayInputProps {
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  className?: string
}

export function StringArrayInput({ value, onChange, placeholder, className }: StringArrayInputProps) {
  const [inputValue, setInputValue] = useState('')

  const addTag = useCallback(() => {
    const trimmed = inputValue.trim()
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed])
      setInputValue('')
    }
  }, [inputValue, value, onChange])

  const removeTag = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-1.5 rounded-[var(--radius-input)] border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-1.5 min-h-[38px] focus-within:border-[var(--color-border-focus)] focus-within:shadow-[var(--shadow-focus)] transition-all duration-150',
        className
      )}
    >
      {value.map((tag, i) => (
        <span
          key={`${tag}-${i}`}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--color-accent-light)] text-[var(--color-accent)] text-xs font-medium"
        >
          <HighlightedText text={tag} />
          <button
            onClick={() => removeTag(i)}
            className="hover:text-[var(--color-error)] transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        value={inputValue}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addTag}
        placeholder={value.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[100px] bg-transparent border-none outline-none text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)]"
      />
    </div>
  )
}
