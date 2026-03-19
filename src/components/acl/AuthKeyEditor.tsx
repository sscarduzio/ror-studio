import { useState } from 'react'
import { Lock, RotateCcw } from 'lucide-react'
import { sha512 } from 'sha512-crypt-ts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { AclRule, RuleType } from '@/schema/types'
import { AUTH_KEY_METHODS } from '@/schema/auth-registry'

const HASH_ALGO: Partial<Record<RuleType, string>> = {
  auth_key_sha1: 'SHA-1',
  auth_key_sha256: 'SHA-256',
  auth_key_sha512: 'SHA-512',
}

const ALGO_LABEL: Partial<Record<RuleType, string>> = {
  auth_key: 'plaintext',
  auth_key_sha1: 'SHA-1',
  auth_key_sha256: 'SHA-256',
  auth_key_sha512: 'SHA-512',
  auth_key_pbkdf2: 'PBKDF2',
  auth_key_unix: 'SHA-512 crypt',
}

async function hashPassword(password: string, algo: string): Promise<string> {
  const data = new TextEncoder().encode(password)
  const hashBuffer = await crypto.subtle.digest(algo, data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function pbkdf2Hash(username: string, password: string): Promise<string> {
  const cleartext = username ? `${username}:${password}` : password
  const passwordBytes = new TextEncoder().encode(password)
  const saltBytes = new TextEncoder().encode(cleartext)
  const key = await crypto.subtle.importKey('raw', passwordBytes, 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-512', salt: saltBytes, iterations: 10000 },
    key,
    512,
  )
  return btoa(String.fromCharCode(...new Uint8Array(bits)))
}

function generateRandomSalt(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789./'
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
}

function unixShadowHash(password: string, rounds: number = 65535): string {
  const salt = generateRandomSalt(16)
  return sha512.crypt(password, `$6$rounds=${rounds}$${salt}`)
}

function parseAuthValue(value: unknown): { username: string; secret: string } {
  const str = typeof value === 'string' ? value : ''
  const colonIdx = str.indexOf(':')
  if (colonIdx === -1) return { username: '', secret: str }
  return { username: str.substring(0, colonIdx), secret: str.substring(colonIdx + 1) }
}

interface AuthKeyEditorProps {
  rule: AclRule
  onChange: (rule: AclRule) => void
}

export function AuthKeyEditor({ rule, onChange }: AuthKeyEditorProps) {
  const algo = HASH_ALGO[rule.type]
  const algoLabel = ALGO_LABEL[rule.type] ?? rule.type
  const isPlaintext = rule.type === 'auth_key'
  const isPbkdf2 = rule.type === 'auth_key_pbkdf2'
  const isUnix = rule.type === 'auth_key_unix'
  const isHashed = !isPlaintext

  const parsed = parseAuthValue(rule.value)
  const hasExistingValue = parsed.secret.length > 0

  // Two modes for hashed types: "locked" (showing the committed hash) vs "editing" (typing plaintext)
  const [editing, setEditing] = useState(!hasExistingValue)
  const [username, setUsername] = useState(parsed.username)
  const [password, setPassword] = useState(isPlaintext ? parsed.secret : '')
  const [rounds, setRounds] = useState(65535)

  // For plaintext auth_key: emit on every change
  const handlePlaintextChange = (user: string, pwd: string) => {
    const value = user ? `${user}:${pwd}` : pwd
    onChange({ ...rule, value })
  }

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const u = e.target.value
    setUsername(u)
    if (isPlaintext) {
      handlePlaintextChange(u, password)
    } else if (!editing && parsed.secret) {
      // Already hashed — just update the username prefix
      const value = u ? `${u}:${parsed.secret}` : parsed.secret
      onChange({ ...rule, value })
    }
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value)
    if (isPlaintext) {
      handlePlaintextChange(username, e.target.value)
    }
  }

  const handleHashAndSave = async () => {
    if (!password) return
    let hash: string
    if (isPbkdf2) {
      hash = await pbkdf2Hash(username, password)
    } else if (isUnix) {
      hash = unixShadowHash(password, rounds)
    } else {
      if (!algo) return
      hash = await hashPassword(password, algo)
    }
    const value = username ? `${username}:${hash}` : hash
    onChange({ ...rule, value })
    setPassword('')
    setEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isHashed && password) {
      e.preventDefault()
      handleHashAndSave()
    }
  }

  // Hashed type: show locked state with the hash
  if (isHashed && !editing && hasExistingValue) {
    return (
      <div className="space-y-1.5">
        <Input
          value={username}
          onChange={handleUsernameChange}
          placeholder="username"
          className="font-mono text-xs h-8"
        />
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded-[var(--radius-input)] bg-gray-100 border border-[var(--color-border)] text-[10px] font-mono text-[var(--color-text-tertiary)] overflow-hidden min-h-[32px]">
            <Lock className="w-3 h-3 shrink-0 text-[var(--color-success)]" />
            <span className="truncate">{parsed.secret}</span>
            <span className="shrink-0 ml-auto text-[var(--color-text-tertiary)]">{algoLabel}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setEditing(true); setPassword('') }}
            className="shrink-0 h-8 px-2 text-xs text-[var(--color-text-secondary)]"
            title="Change password"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    )
  }

  // Editing state (plaintext or hashed before committing)
  return (
    <div className="space-y-1.5">
      <Input
        value={username}
        onChange={handleUsernameChange}
        placeholder="username"
        className="font-mono text-xs h-8"
      />
      <div className="flex items-center gap-2">
        <Input
          value={password}
          onChange={handlePasswordChange}
          onKeyDown={handleKeyDown}
          placeholder={isPlaintext ? 'password' : 'password (plaintext)'}
          className="font-mono text-xs h-8 flex-1"
          autoFocus={isHashed}
        />
        {isUnix && (
          <Input
            type="number"
            value={rounds}
            onChange={(e) => setRounds(Math.max(1000, Math.min(999999999, Number(e.target.value) || 65535)))}
            min={1000}
            max={999999999}
            title="Rounds"
            className="font-mono text-xs h-8 w-24 shrink-0"
          />
        )}
        {isHashed && (
          <Button
            size="sm"
            onClick={handleHashAndSave}
            disabled={!password}
            className="shrink-0 h-8 px-3 text-xs gap-1.5"
          >
            <Lock className="w-3 h-3" />
            Hash ({algoLabel})
          </Button>
        )}
      </div>
    </div>
  )
}

/** Rule types handled by AuthKeyEditor — re-exported from shared registry */
export const AUTH_KEY_TYPES = AUTH_KEY_METHODS
