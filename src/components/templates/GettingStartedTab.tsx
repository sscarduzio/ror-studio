import { useState, useCallback, useRef } from 'react'
import {
  Wand2, Upload, Clipboard, ArrowRight, ArrowDown, ArrowUp, Shield,
  AlertTriangle, LayoutTemplate, FileUp, ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useEditorStore } from '@/store/editor-store'
import { useToast } from '@/components/ui/toast-simple'
import type { Edition } from '@/schema/types'
import { cn } from '@/lib/utils'
import { styles } from '@/components/shared-styles'
import { yamlToConfig } from '@/utils/yaml'
import { WizardModal } from '@/components/wizard/WizardModal'
import { TemplatePreviewDialog } from './TemplatePreviewDialog'
import { templates, type TemplateDef } from './template-data'

const SPARKLES = [
  { top: '-4px', left: '20%', color: '#5eead4', dur: '0.9s', delay: '0s', sx: '-6px', sy: '-8px', ex: '-14px', ey: '-22px' },
  { top: '10%', right: '-6px', color: '#fbbf24', dur: '1.1s', delay: '0.05s', sx: '8px', sy: '-4px', ex: '20px', ey: '-18px' },
  { top: '30%', left: '-5px', color: '#a78bfa', dur: '1s', delay: '0.1s', sx: '-8px', sy: '2px', ex: '-22px', ey: '-10px' },
  { top: '55%', right: '-4px', color: '#34d399', dur: '0.85s', delay: '0.15s', sx: '6px', sy: '4px', ex: '18px', ey: '-8px' },
  { bottom: '15%', left: '15%', color: '#5eead4', dur: '1.05s', delay: '0.08s', sx: '-4px', sy: '6px', ex: '-16px', ey: '-14px' },
  { top: '5%', left: '60%', color: '#f9a8d4', dur: '0.95s', delay: '0.12s', sx: '2px', sy: '-10px', ex: '8px', ey: '-26px' },
  { bottom: '5%', right: '20%', color: '#fbbf24', dur: '1.15s', delay: '0.18s', sx: '4px', sy: '8px', ex: '14px', ey: '-12px' },
  { top: '45%', left: '50%', color: '#a78bfa', dur: '0.9s', delay: '0.22s', sx: '-2px', sy: '-6px', ex: '-10px', ey: '-20px' },
]

function TierBadge({ tier }: { tier: Edition }) {
  if (tier === 'free') return null
  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold rounded',
        tier === 'pro' ? styles.tierBadge.pro : styles.tierBadge.ent
      )}
    >
      {tier === 'pro' ? 'PRO' : 'ENT'}
    </span>
  )
}

export function GettingStartedTab() {
  const [pasteValue, setPasteValue] = useState('')
  const [importError, setImportError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [previewTemplate, setPreviewTemplate] = useState<TemplateDef | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const setConfig = useEditorStore((s) => s.setConfig)
  const setActiveTab = useEditorStore((s) => s.setActiveTab)
  const setEdition = useEditorStore((s) => s.setEdition)
  const { toast } = useToast()

  const handleTemplateClick = (template: TemplateDef) => {
    setPreviewTemplate(template)
    setPreviewOpen(true)
  }

  const handleTemplateConfirm = (template: TemplateDef) => {
    const config = template.buildConfig()
    if (template.tier === 'enterprise') {
      setEdition('enterprise')
    } else if (template.tier === 'pro') {
      const currentEdition = useEditorStore.getState().edition
      if (currentEdition === 'free') {
        setEdition('pro')
      }
    }
    setConfig(config)
    setActiveTab('acl-flow')
    setPreviewOpen(false)
    setPreviewTemplate(null)
    toast(`Loaded template: ${template.title}`)
  }

  const parseAndImport = useCallback((yamlText: string) => {
    setImportError(null)
    try {
      const { config, warnings } = yamlToConfig(yamlText)
      if (warnings.length > 0) {
        setImportError(`Imported with warnings: ${warnings.join(', ')}`)
      }
      setConfig(config)
      setActiveTab('acl-flow')
      toast('Configuration imported')
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Failed to parse YAML')
    }
  }, [setConfig, setActiveTab, toast])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') parseAndImport(reader.result)
      }
      reader.readAsText(file)
    }
  }, [parseAndImport])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') parseAndImport(reader.result)
      }
      reader.readAsText(file)
    }
    e.target.value = ''
  }, [parseAndImport])

  return (
    <div className="relative w-full min-h-full text-slate-800 max-w-4xl mx-auto">
      <WizardModal open={wizardOpen} onOpenChange={setWizardOpen} />
      <TemplatePreviewDialog
        template={previewTemplate}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        onConfirm={handleTemplateConfirm}
      />

      <div className="relative z-10 px-8 lg:px-12 pb-12 pt-8 max-w-[960px]">

        {/* ──────────────── HERO ──────────────── */}
        <div className="mb-12">
          <div className="flex items-start gap-8">
            {/* Left column — text content */}
            <div className="flex-1 min-w-0">

              {/* Headline */}
              <h1
                className="font-black tracking-tight text-slate-900 leading-[1] max-w-[520px]"
                style={{
                  fontSize: 'clamp(2.75rem, 6.5vw, 4rem)',
                  textShadow: '3px 3px 0 rgba(13, 148, 136, 0.12)',
                }}
              >
                Build your ACL{' '}
                <span
                  className="text-teal-600"
                  style={{ textShadow: '3px 3px 0 rgba(13, 148, 136, 0.18)' }}
                >
                  visually.
                </span>
              </h1>
              <p className="mt-3 text-[15px] text-slate-500 leading-relaxed max-w-[480px]">
                The visual editor for{' '}
                <a
                  href="https://readonlyrest.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-700 font-semibold hover:text-teal-800 hover:underline underline-offset-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 rounded-sm"
                >
                  ReadOnlyREST
                </a>
                . Catch errors in real-time, export perfect YAML.
              </p>
            </div>

            {/* Right column — YAML preview card (light theme) */}
            <div
              className="hidden lg:block shrink-0 select-none self-center yaml-card-wrap"
              style={{ width: '270px' }}
              aria-hidden="true"
            >
              {/* Sparkle particles */}
              {SPARKLES.map((s, i) => (
                <div
                  key={i}
                  className="sparkle"
                  style={{
                    top: s.top, bottom: s.bottom, left: s.left, right: s.right,
                    background: s.color,
                    boxShadow: `0 0 6px 1px ${s.color}`,
                    '--dur': s.dur, '--delay': s.delay,
                    '--sx': s.sx, '--sy': s.sy, '--ex': s.ex, '--ey': s.ey,
                  } as React.CSSProperties}
                />
              ))}
              <div className="yaml-card rounded-md overflow-hidden">
                {/* Teal gradient accent bar */}
                <div style={{ height: 3, background: 'linear-gradient(to right, #0d9488, #06b6d4, #0d9488)' }} />
                {/* Window chrome — light */}
                <div className="flex items-center gap-1.5 px-3 py-[6px]" style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                  <div className="w-[7px] h-[7px] rounded-full" style={{ background: '#f87171' }} />
                  <div className="w-[7px] h-[7px] rounded-full" style={{ background: '#fbbf24' }} />
                  <div className="w-[7px] h-[7px] rounded-full" style={{ background: '#34d399' }} />
                  <span className="ml-2 tracking-wide" style={{ fontSize: '8.5px', fontFamily: 'var(--font-mono)', color: '#94a3b8' }}>readonlyrest.yml</span>
                </div>
                {/* Code body — light background, vivid syntax */}
                <div className="px-3.5 py-3 overflow-hidden" style={{ background: '#fafcff', fontSize: '10.5px', lineHeight: 1.75, fontFamily: 'var(--font-mono)' }}>
                  <div><span style={{ color: '#0d9488', fontWeight: 600 }}>readonlyrest</span><span style={{ color: '#94a3b8' }}>:</span></div>
                  <div><span style={{ color: '#94a3b8' }}>{'  '}</span><span style={{ color: '#0d9488', fontWeight: 600 }}>access_control_rules</span><span style={{ color: '#94a3b8' }}>:</span></div>
                  <div style={{ height: 4 }} />
                  <div><span style={{ color: '#94a3b8' }}>{'  - '}</span><span style={{ color: '#0d9488' }}>name</span><span style={{ color: '#94a3b8' }}>: </span><span style={{ color: '#b45309' }}>"Admin Full Access"</span></div>
                  <div><span style={{ color: '#94a3b8' }}>{'    '}</span><span style={{ color: '#0d9488' }}>auth_key</span><span style={{ color: '#94a3b8' }}>: </span><span style={{ color: '#7c3aed' }}>admin:admin123</span></div>
                  <div><span style={{ color: '#94a3b8' }}>{'    '}</span><span style={{ color: '#0d9488' }}>kibana</span><span style={{ color: '#94a3b8' }}>:</span></div>
                  <div><span style={{ color: '#94a3b8' }}>{'      '}</span><span style={{ color: '#0d9488' }}>access</span><span style={{ color: '#94a3b8' }}>: </span><span style={{ color: '#7c3aed' }}>admin</span></div>
                  <div style={{ height: 4 }} />
                  <div><span style={{ color: '#94a3b8' }}>{'  - '}</span><span style={{ color: '#0d9488' }}>name</span><span style={{ color: '#94a3b8' }}>: </span><span style={{ color: '#b45309' }}>"Team Alpha"</span></div>
                  <div><span style={{ color: '#94a3b8' }}>{'    '}</span><span style={{ color: '#0d9488' }}>auth_key_sha256</span><span style={{ color: '#94a3b8' }}>: </span><span style={{ color: '#7c3aed' }}>e796d...</span></div>
                  <div><span style={{ color: '#94a3b8' }}>{'    '}</span><span style={{ color: '#0d9488' }}>groups</span><span style={{ color: '#94a3b8' }}>:</span></div>
                  <div><span style={{ color: '#94a3b8' }}>{'      - '}</span><span style={{ color: '#7c3aed' }}>team_alpha</span></div>
                  <div><span style={{ color: '#94a3b8' }}>{'    '}</span><span style={{ color: '#0d9488' }}>indices</span><span style={{ color: '#94a3b8' }}>:</span></div>
                  <div><span style={{ color: '#94a3b8' }}>{'      - '}</span><span style={{ color: '#7c3aed' }}>alpha-*</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* Primary CTA — below the two-column hero */}
          <button
            onClick={() => setWizardOpen(true)}
            aria-label="Start guided setup wizard"
            className="group mt-8 flex items-center gap-4 px-6 py-4 rounded-2xl bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-lg shadow-teal-500/20 hover:shadow-xl hover:shadow-teal-500/30 hover:from-teal-500 hover:to-teal-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 transition-all duration-300"
          >
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0 group-hover:bg-white/30 transition-colors">
              <Wand2 className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="text-left">
              <div className="text-[15px] font-bold">Start Guided Setup</div>
              <div className="text-xs text-white/70">Build your first zero-trust block in under a minute</div>
            </div>
            <ArrowRight className="w-5 h-5 ml-auto opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" aria-hidden="true" />
          </button>

          {/* Secondary actions — compact inline links */}
          <div className="mt-4 flex items-center gap-6 text-[13px]">
            <a
              href="#templates"
              className="group flex items-center gap-1.5 text-slate-500 hover:text-slate-900 transition-colors font-medium"
            >
              <LayoutTemplate className="w-4 h-4" aria-hidden="true" />
              Use a template
              <ChevronRight className="w-3 h-3 opacity-0 -ml-1 group-hover:opacity-100 group-hover:ml-0 transition-all" aria-hidden="true" />
            </a>
            <button
              onClick={() => setShowImport(!showImport)}
              aria-expanded={showImport}
              className="group flex items-center gap-1.5 text-slate-500 hover:text-slate-900 transition-colors font-medium"
            >
              <FileUp className="w-4 h-4" aria-hidden="true" />
              Import existing config
              {showImport
                ? <ArrowUp className="w-3 h-3 transition-transform" aria-hidden="true" />
                : <ArrowDown className="w-3 h-3 transition-transform" aria-hidden="true" />
              }
            </button>
          </div>
        </div>

        {/* ──────────────── IMPORT (collapsible) ──────────────── */}
        {showImport && (
          <div className="mb-10 rounded-2xl border border-slate-200 bg-slate-50/50 p-6 max-w-[560px]">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Import existing configuration</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Drop zone */}
              <div
                role="button"
                tabIndex={0}
                aria-label="Upload YAML file — click to browse or drag and drop"
                onDragOver={(e: React.DragEvent) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click() } }}
                className={cn(
                  'rounded-xl border-2 border-dashed p-5 flex flex-col items-center justify-center text-center gap-2 transition-all duration-200 cursor-pointer group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500',
                  dragOver
                    ? 'border-teal-400 bg-teal-50'
                    : 'border-slate-300 bg-white hover:border-teal-300 hover:bg-teal-50/30'
                )}
              >
                <input ref={fileInputRef} type="file" accept=".yml,.yaml" onChange={handleFileSelect} className="hidden" aria-label="Choose YAML file" />
                <Upload className={cn('w-5 h-5 transition-colors', dragOver ? 'text-teal-600' : 'text-slate-400 group-hover:text-teal-500')} aria-hidden="true" />
                <div className="text-xs font-bold text-slate-600">Drop file here</div>
                <div className="text-[10px] text-slate-400">.yml / .yaml</div>
              </div>
              {/* Paste area */}
              <div className="relative group/textarea">
                <Textarea
                  value={pasteValue}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPasteValue(e.target.value)}
                  placeholder="Paste YAML..."
                  aria-label="Paste YAML configuration"
                  className="h-full min-h-[120px] font-mono text-xs resize-none bg-white border-slate-200 text-slate-800 focus-visible:ring-1 focus-visible:ring-teal-500 focus-visible:border-teal-500 rounded-xl"
                />
                {pasteValue.trim() && (
                  <Button
                    size="sm"
                    onClick={() => parseAndImport(pasteValue)}
                    className="absolute bottom-2 right-2 h-7 px-3 text-[11px] font-bold bg-slate-900 text-white hover:bg-slate-800 rounded-md shadow-sm"
                  >
                    <Clipboard className="w-3 h-3 mr-1.5" aria-hidden="true" />
                    Inject
                  </Button>
                )}
              </div>
            </div>
            {importError && (
              <div role="alert" className="mt-3 text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5 flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                <span className="font-medium leading-relaxed">{importError}</span>
              </div>
            )}
          </div>
        )}

        {/* ──────────────── TEMPLATES ──────────────── */}
        <div id="templates" className="mb-10 scroll-mt-4" role="region" aria-label="Templates">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Templates</h2>
            <span className="text-[11px] text-slate-400">{templates.length} production patterns</span>
          </div>

          {/* Horizontal scrollable template strip */}
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-none">
            {templates.map((tpl) => {
              const tierColor = tpl.tier === 'pro' ? 'teal' : tpl.tier === 'enterprise' ? 'amber' : 'slate'
              return (
                <button
                  key={tpl.id}
                  onClick={() => handleTemplateClick(tpl)}
                  aria-label={`${tpl.title}${tpl.tier !== 'free' ? ` (${tpl.tier})` : ''} template`}
                  className={cn(
                    'group snap-start shrink-0 w-[220px] text-left rounded-xl border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500',
                    tierColor === 'teal' && 'border-teal-200 bg-gradient-to-br from-teal-50 to-white hover:border-teal-300',
                    tierColor === 'amber' && 'border-amber-200 bg-gradient-to-br from-amber-50 to-white hover:border-amber-300',
                    tierColor === 'slate' && 'border-slate-200 bg-white hover:border-slate-300',
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={cn(
                      'w-8 h-8 rounded-lg border flex items-center justify-center',
                      tierColor === 'teal' && 'bg-teal-100/80 text-teal-600 border-teal-200',
                      tierColor === 'amber' && 'bg-amber-100/80 text-amber-600 border-amber-200',
                      tierColor === 'slate' && 'bg-slate-50 text-slate-500 border-slate-200',
                    )}>
                      <tpl.icon className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <TierBadge tier={tpl.tier} />
                  </div>
                  <h4 className="text-[13px] font-bold text-slate-900 leading-snug">{tpl.title}</h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-2">{tpl.description}</p>
                  <div className="mt-3 flex items-center gap-1 text-[11px] font-medium text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    Preview <ChevronRight className="w-3 h-3" />
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* ──────────────── HOW IT WORKS ──────────────── */}
        <section className="mb-8" aria-label="How it works">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight mb-4">How the ACL works</h2>
          <div className="flex flex-col gap-0">
            {[
              { num: '1', title: 'Top-to-bottom evaluation', desc: 'Requests hit blocks sequentially. First complete match wins.' },
              { num: '2', title: 'Rules are AND-ed', desc: 'Every rule in a block must pass. Use separate blocks for OR logic.' },
              { num: '3', title: 'Real-time validation', desc: 'Syntax errors, stale references, and structural issues caught instantly.' },
            ].map((item) => (
              <div key={item.num} className="flex items-start gap-4 py-3 border-b border-slate-100 last:border-0">
                <div className="w-6 h-6 rounded-full bg-teal-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {item.num}
                </div>
                <div>
                  <h4 className="text-[13px] font-bold text-slate-900">{item.title}</h4>
                  <p className="text-[12px] text-slate-500 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ──────────────── FOOTER ──────────────── */}
        <footer className="pt-4 border-t border-slate-100">
          <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Shield className="w-3 h-3 text-teal-500/50" aria-hidden="true" />
            Air-gapped. Zero data leaves your browser.
          </p>
        </footer>
      </div>
    </div>
  )
}
