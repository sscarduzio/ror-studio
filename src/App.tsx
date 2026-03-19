import { useEffect } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ToastProvider } from '@/components/ui/toast-simple'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { TabContainer } from '@/components/layout/TabContainer'
import { YamlPreview } from '@/components/layout/YamlPreview'
import { ErrorPanel } from '@/components/layout/ErrorPanel'
import { useEditorStore } from '@/store/editor-store'
import { loadState, saveState } from '@/store/persistence'
import { Group, Panel, Separator } from 'react-resizable-panels'

function App() {
  const config = useEditorStore((s) => s.config)
  const edition = useEditorStore((s) => s.edition)
  const activeTab = useEditorStore((s) => s.activeTab)
  const wizardSeen = useEditorStore((s) => s.wizardSeen)
  const yamlDock = useEditorStore((s) => s.yamlDock)
  const setConfig = useEditorStore((s) => s.setConfig)
  const setEdition = useEditorStore((s) => s.setEdition)
  const setActiveTab = useEditorStore((s) => s.setActiveTab)
  const setWizardSeen = useEditorStore((s) => s.setWizardSeen)
  const setYamlDock = useEditorStore((s) => s.setYamlDock)
  const previewVisible = useEditorStore((s) => s.previewVisible)

  // Restore state from localStorage on mount
  useEffect(() => {
    const saved = loadState()
    if (saved) {
      setConfig(saved.config)
      setEdition(saved.edition)
      setActiveTab(saved.activeTab)
      setWizardSeen(saved.wizardSeen)
      setYamlDock(saved.yamlDock)
    }
  }, [setConfig, setEdition, setActiveTab, setWizardSeen, setYamlDock])

  // Auto-save to localStorage on every change
  useEffect(() => {
    const timeout = setTimeout(() => {
      saveState({ config, edition, activeTab, wizardSeen, yamlDock })
    }, 500)
    return () => clearTimeout(timeout)
  }, [config, edition, activeTab, wizardSeen, yamlDock])

  // Prevent browser back from leaving the SPA
  useEffect(() => {
    const handler = (e: PopStateEvent) => {
      // Always push state back to prevent navigating away
      e.preventDefault()
      history.pushState(null, '', window.location.href)
    }
    // Seed history so there's always an entry to come back to
    history.pushState(null, '', window.location.href)
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault()
        const store = useEditorStore.getState()
        if (e.shiftKey) {
          store.redo()
        } else {
          store.undo()
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const hasContent = config.access_control_rules.length > 0
    || (config.users ?? []).length > 0
    || (config.ldaps ?? []).length > 0
    || (config.jwt ?? []).length > 0

  return (
    <TooltipProvider>
      <ToastProvider>
        <div className="h-screen flex flex-col bg-[#f8f9fc] text-slate-900 overflow-hidden relative">
          {/* Subtle ambient glow — warm teal radial in top-left, cool slate bottom-right */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(ellipse 80% 60% at 10% 0%, rgba(13,148,136,0.04) 0%, transparent 70%), radial-gradient(ellipse 60% 50% at 90% 100%, rgba(148,163,184,0.05) 0%, transparent 70%)',
          }} />
          
          <div className="relative z-10 flex flex-col h-full w-full">
            <Header />
            <div className="flex-1 flex overflow-hidden">
              {hasContent && <Sidebar />}
              <div className={`flex-1 flex flex-col overflow-hidden ${hasContent ? 'bg-white/60 rounded-tl-xl shadow-sm mr-1.5 mb-1.5 border border-slate-200/40' : ''}`}>
                {hasContent && previewVisible ? (
                  <Group orientation={yamlDock === 'right' ? 'horizontal' : 'vertical'} key={yamlDock}>
                    <Panel defaultSize={70} minSize={30}>
                      <div className="flex flex-col h-full overflow-hidden">
                        <div className="flex-1 overflow-y-auto">
                          <TabContainer />
                        </div>
                        <ErrorPanel />
                      </div>
                    </Panel>
                    <Separator
                      className={
                        yamlDock === 'right'
                          ? 'w-1 bg-slate-200 hover:bg-teal-500/50 transition-colors cursor-col-resize'
                          : 'h-1 bg-slate-200 hover:bg-teal-500/50 transition-colors cursor-row-resize'
                      }
                    />
                    <Panel defaultSize={30} minSize={15}>
                      <YamlPreview dock={yamlDock} />
                    </Panel>
                  </Group>
                ) : (
                  <div className="flex flex-col h-full overflow-hidden">
                    <div className="flex-1 overflow-y-auto">
                      <TabContainer />
                    </div>
                    {hasContent && <ErrorPanel />}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </ToastProvider>
    </TooltipProvider>
  )
}

export default App
