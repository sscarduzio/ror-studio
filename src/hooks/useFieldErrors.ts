import { useMemo } from 'react'
import { useValidation } from '@/hooks/useValidation'
import type { ValidationIssue } from '@/validation/types'

/**
 * Returns validation issues whose `field` starts with the given prefix.
 */
export function useFieldErrors(fieldPrefix: string): ValidationIssue[] {
  const { issues } = useValidation()
  return useMemo(
    () => issues.filter((i) => i.field?.startsWith(fieldPrefix)),
    [issues, fieldPrefix],
  )
}
