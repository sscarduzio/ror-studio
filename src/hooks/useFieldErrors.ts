import { useMemo } from 'react'
import { useValidation } from '@/hooks/useValidation'
import type { ValidationIssue } from '@/validation/types'

/**
 * Returns validation issues whose `field` exactly matches or is a child of the given prefix.
 * Uses boundary checking to prevent `[0]` from matching `[01]` or `[00]`.
 */
export function useFieldErrors(fieldPrefix: string): ValidationIssue[] {
  const { issues } = useValidation()
  return useMemo(
    () => issues.filter((i) => {
      if (!i.field) return false
      if (i.field === fieldPrefix) return true
      // Must be followed by '.' or '[' to be a child field, not a coincidental prefix overlap
      return i.field.startsWith(fieldPrefix) &&
        (i.field[fieldPrefix.length] === '.' || i.field[fieldPrefix.length] === '[')
    }),
    [issues, fieldPrefix],
  )
}
