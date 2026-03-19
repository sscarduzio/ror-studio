import { useEditorStore } from '@/store/editor-store'

/** Whether the config has any meaningful content (blocks, users, or connectors). */
export function useHasContent(): boolean {
  const config = useEditorStore((s) => s.config)
  return config.access_control_rules.length > 0
    || (config.users ?? []).length > 0
    || (config.ldaps ?? []).length > 0
    || (config.jwt ?? []).length > 0
}
