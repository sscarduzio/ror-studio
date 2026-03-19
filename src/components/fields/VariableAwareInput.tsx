import { Input } from '@/components/ui/input'
import { containsVariable, HighlightedText } from '@/utils/ror-variables'

type InputProps = React.ComponentProps<typeof Input>

export function VariableAwareInput({ value, ...props }: InputProps) {
  const strValue = typeof value === 'string' ? value : String(value ?? '')
  const hasVars = strValue.length > 0 && containsVariable(strValue)

  return (
    <div>
      <Input value={value} {...props} />
      {hasVars && (
        <div className="text-[10px] text-[var(--color-text-tertiary)] mt-1 truncate">
          <HighlightedText text={strValue} />
        </div>
      )}
    </div>
  )
}
