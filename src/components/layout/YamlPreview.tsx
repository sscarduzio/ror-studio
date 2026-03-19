import { Suspense, useRef, useCallback } from 'react'
import { Copy, Download, PanelBottom, PanelRight } from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { useToast } from '@/components/ui/toast-simple'
import { useValidation } from '@/hooks/useValidation'
import { MonacoYamlPreview, type MonacoYamlPreviewHandle } from '@/components/layout/MonacoYamlPreview'
import { YamlEditorContext } from '@/contexts/YamlEditorContext'
import { useEditorStore, type YamlDock } from '@/store/editor-store'
import { cn } from '@/lib/utils'

interface YamlPreviewProps {
  dock?: YamlDock
}

export function YamlPreview({ dock = 'bottom' }: YamlPreviewProps) {
  const setYamlDock = useEditorStore((s) => s.setYamlDock)
  const { yamlText, issues, errorCount } = useValidation()
  const { toast } = useToast()
  const monacoRef = useRef<MonacoYamlPreviewHandle>(null)

  const lineCount = yamlText.split('\n').length

  const handleCopy = () => {
    navigator.clipboard.writeText(yamlText)
    toast('Copied to clipboard')
  }

  const handleDownload = () => {
    const blob = new Blob([yamlText], { type: 'text/yaml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'readonlyrest.yml'
    a.click()
    URL.revokeObjectURL(url)
  }

  const revealLine = useCallback((line: number) => {
    monacoRef.current?.revealLine(line)
  }, [])

  const hasErrors = errorCount > 0

  return (
    <YamlEditorContext.Provider value={{ revealLine }}>
      <div className={cn(
        'flex flex-col h-full',
        dock === 'right' ? 'border-l border-[var(--color-border)]' : 'border-t border-[var(--color-border)]'
      )}>
        {/* Header bar */}
        <div className="flex items-center justify-between px-3 py-2 bg-white/70 backdrop-blur-md border-b border-slate-200/50 shadow-sm z-10">
          <div className="flex items-center gap-2 text-[13px] font-bold text-slate-600 uppercase tracking-wider">
            Preview
            <span className="text-slate-400 font-medium">({lineCount} lines)</span>
          </div>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setYamlDock('bottom')}
                  className={cn(
                    'p-1.5 rounded-md transition-all duration-200',
                    dock === 'bottom'
                      ? 'text-teal-700 bg-slate-100 shadow-sm border border-slate-200'
                      : 'text-slate-400 hover:text-slate-700 hover:bg-white/60 border border-transparent'
                  )}
                  aria-label="Dock to bottom"
                >
                  <PanelBottom className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 border-slate-800 text-white text-xs">Dock to bottom</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setYamlDock('right')}
                  className={cn(
                    'p-1.5 rounded-md transition-all duration-200',
                    dock === 'right'
                       ? 'text-teal-700 bg-slate-100 shadow-sm border border-slate-200'
                      : 'text-slate-400 hover:text-slate-700 hover:bg-white/60 border border-transparent'
                  )}
                  aria-label="Dock to right"
                >
                  <PanelRight className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 border-slate-800 text-white text-xs">Dock to right</TooltipContent>
            </Tooltip>
            <div className="w-px h-4 bg-slate-200 mx-1" />
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleCopy}
                  disabled={hasErrors}
                  className={cn(
                    'p-1.5 rounded-md transition-all duration-200 border border-transparent',
                    hasErrors
                      ? 'text-slate-300 cursor-not-allowed'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white/60 hover:shadow-sm hover:border-slate-200'
                  )}
                  aria-label="Copy"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 border-slate-800 text-white text-xs">{hasErrors ? 'Fix errors before copying' : 'Copy'}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleDownload}
                  disabled={hasErrors}
                  className={cn(
                    'p-1.5 rounded-md transition-all duration-200 border border-transparent',
                    hasErrors
                      ? 'text-slate-300 cursor-not-allowed'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white/60 hover:shadow-sm hover:border-slate-200'
                  )}
                  aria-label="Download"
                >
                  <Download className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 border-slate-800 text-white text-xs">{hasErrors ? 'Fix errors before downloading' : 'Download'}</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Monaco editor area */}
        <div className="flex-1 overflow-hidden bg-slate-50/50">
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-full text-xs text-gray-400">
                Loading YAML editor...
              </div>
            }
          >
            <MonacoYamlPreview
              ref={monacoRef}
              yamlText={yamlText}
              issues={issues}
            />
          </Suspense>
        </div>
      </div>
    </YamlEditorContext.Provider>
  )
}
