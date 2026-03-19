/**
 * Shared CSS class constants extracted from tab components.
 * Import as: import { styles } from '@/components/shared-styles'
 */

export const styles = {
  /** Card container: rounded border with background and shadow */
  card: 'rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card)]',

  /** Card container with vertical spacing (space-y-4) */
  cardWithSpace: 'rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card)] space-y-4',

  /** Card container with tighter vertical spacing (space-y-3) */
  cardWithSpaceTight: 'rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card)] space-y-3',

  /** Dashed border empty state container */
  emptyState: 'rounded-[var(--radius-card)] border border-dashed border-[var(--color-border)] p-8 flex flex-col items-center gap-2',

  /** Empty state container with more padding and gap (used for "no items" cards) */
  emptyStateCard: 'rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] p-12 flex flex-col items-center gap-3',

  /** Field label: small semibold secondary text */
  fieldLabel: 'text-xs font-semibold text-[var(--color-text-secondary)]',

  /** Section title: small bold primary text */
  sectionTitle: 'text-sm font-bold text-[var(--color-text-primary)]',

  /** Page title: large bold tracked primary text */
  pageTitle: 'text-lg font-bold tracking-[-0.02em] text-[var(--color-text-primary)]',

  /** Page subtitle: small secondary text with top margin */
  pageSubtitle: 'text-sm text-[var(--color-text-secondary)] mt-0.5',

  /** Standard page container with max width and spacing */
  pageContainer: 'max-w-3xl mx-auto space-y-6',

  /** Page container with wider spacing (space-y-8) */
  pageContainerWide: 'max-w-3xl mx-auto space-y-8',

  /** Native select element styling */
  select: 'mt-1 w-full rounded-[var(--radius-input)] border border-[var(--color-border)] bg-white px-3 py-2 text-sm',

  /** Monospace input addon class */
  monoInput: 'mt-1 font-mono text-xs',

  /** Red remove/delete button */
  removeButton: 'text-[var(--color-error)] hover:bg-[var(--color-error-bg)]',

  /** Red remove/delete button (with hover text color preserved) */
  removeButtonFull: 'text-[var(--color-error)] hover:text-[var(--color-error)] hover:bg-[var(--color-error-bg)]',

  /** Inline code snippet styling */
  codeInline: 'text-xs bg-gray-100 px-1 rounded font-mono',

  /** Uppercase micro-label for section/category headers (sidebar, rule groups, user sections) */
  categoryLabel: 'text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]',

  /** Tier badge styles */
  tierBadge: {
    pro: 'bg-[var(--color-tier-pro-bg)] text-[var(--color-tier-pro-text)]',
    ent: 'bg-[var(--color-tier-ent-bg)] text-[var(--color-tier-ent-text)]',
  },
} as const
