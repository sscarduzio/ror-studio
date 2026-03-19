/**
 * Build a map from dotted field paths to 1-based YAML line numbers.
 * Works reliably because configToYaml() uses deterministic formatting
 * (indent=2, no refs, no line wrapping).
 *
 * Paths are returned WITHOUT the `readonlyrest.` prefix so they match
 * validator conventions (e.g., `access_control_rules[0].name` → line 5).
 */
export function buildYamlLineMap(yamlText: string): Map<string, number> {
  const map = new Map<string, number>()
  const lines = yamlText.split('\n')

  // Stack of { path, indent } representing nesting context
  // path is the full dotted path up to and including this key
  const stack: Array<{ path: string; indent: number }> = []

  // Track array index counters keyed by the parent path
  const arrayCounters = new Map<string, number>()

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineNum = i + 1

    // Skip empty lines and comments
    if (line.trim() === '' || line.trimStart().startsWith('#')) continue

    const stripped = line.trimStart()
    const indent = line.length - stripped.length

    // Pop stack entries at or deeper than current indent
    while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
      stack.pop()
    }

    const parentPath = stack.length > 0 ? stack[stack.length - 1].path : ''

    // Array item: starts with "- "
    if (stripped.startsWith('- ')) {
      const rest = stripped.slice(2)

      // Get or increment array index for this parent+indent combo
      const counterKey = `${parentPath}@${indent}`
      const idx = (arrayCounters.get(counterKey) ?? -1) + 1
      arrayCounters.set(counterKey, idx)

      // Clear counters for deeper indents
      for (const [k] of arrayCounters) {
        if (k !== counterKey && k.startsWith(parentPath) && k > counterKey) {
          arrayCounters.delete(k)
        }
      }

      const arrayItemPath = parentPath ? `${parentPath}[${idx}]` : `[${idx}]`
      const cleanItemPath = cleanPath(arrayItemPath)
      map.set(cleanItemPath, lineNum)

      // Check if it's `- key: value` (object within array)
      const keyMatch = rest.match(/^([\w_.-]+)\s*:(.*)$/)
      if (keyMatch) {
        const key = keyMatch[1]
        const fullPath = `${arrayItemPath}.${key}`
        const clean = cleanPath(fullPath)
        map.set(clean, lineNum)

        // Push the array item as context for nested keys.
        // Use indent+1 so children at indent+2 don't pop this entry
        // (the >= comparison in the pop loop would incorrectly remove it at indent+2).
        stack.push({ path: arrayItemPath, indent: indent + 1 })
      } else {
        // Scalar array item — already mapped
        stack.push({ path: arrayItemPath, indent: indent + 1 })
      }
      continue
    }

    // Key: value line
    const keyMatch = stripped.match(/^([\w_.-]+)\s*:(.*)$/)
    if (keyMatch) {
      const key = keyMatch[1]

      // Clear array counters at deeper indents
      for (const [k] of arrayCounters) {
        const atIdx = k.lastIndexOf('@')
        if (atIdx >= 0) {
          const kIndent = parseInt(k.slice(atIdx + 1), 10)
          if (kIndent > indent) arrayCounters.delete(k)
        }
      }

      const fullPath = parentPath ? `${parentPath}.${key}` : key
      const clean = cleanPath(fullPath)
      map.set(clean, lineNum)

      // Push onto stack for nested content
      stack.push({ path: fullPath, indent })
    }
  }

  return map
}

function cleanPath(path: string): string {
  return path.replace(/^readonlyrest\./, '')
}
