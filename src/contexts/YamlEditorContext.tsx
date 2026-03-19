import { createContext, useContext } from 'react'

export interface YamlEditorContextValue {
  revealLine: (line: number) => void
}

export const YamlEditorContext = createContext<YamlEditorContextValue>({
  revealLine: () => {},
})

export function useYamlEditor() {
  return useContext(YamlEditorContext)
}
