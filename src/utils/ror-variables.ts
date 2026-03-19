import React from 'react'

const ROR_VAR_RE = /@(explode)?\{[a-zA-Z_][a-zA-Z0-9_.:/-]*\}(\.(to_lowercase|replace_first\([^)]*\)|replace_all\([^)]*\)))*/g

export type Segment = { type: 'text' | 'variable'; value: string }

export function parseVariableSegments(text: string): Segment[] {
  const segments: Segment[] = []
  let lastIndex = 0
  ROR_VAR_RE.lastIndex = 0

  let match: RegExpExecArray | null
  while ((match = ROR_VAR_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, match.index) })
    }
    segments.push({ type: 'variable', value: match[0] })
    lastIndex = ROR_VAR_RE.lastIndex
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) })
  }

  return segments
}

export function containsVariable(text: string): boolean {
  ROR_VAR_RE.lastIndex = 0
  return ROR_VAR_RE.test(text)
}

export function HighlightedText({ text }: { text: string }): React.ReactElement {
  const segments = parseVariableSegments(text)

  if (segments.length === 1 && segments[0].type === 'text') {
    return React.createElement('span', null, text)
  }

  return React.createElement(
    'span',
    null,
    ...segments.map((seg, i) =>
      seg.type === 'variable'
        ? React.createElement(
            'span',
            {
              key: i,
              className: 'text-violet-600 bg-violet-50 px-0.5 rounded-sm font-mono text-[0.9em]',
            },
            seg.value,
          )
        : React.createElement('span', { key: i }, seg.value),
    ),
  )
}
