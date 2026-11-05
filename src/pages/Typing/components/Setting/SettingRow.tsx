import styles from './index.module.css'
import { Switch } from '@headlessui/react'
import type { ReactNode } from 'react'

export function SettingRow({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <div className={styles.row}>
      <div className="min-w-0 flex-1">
        <div className={styles.rowLabel}>{title}</div>
        {description && <p className={styles.rowDescription}>{description}</p>}
      </div>
      <div className="flex max-w-[50%] shrink-0 items-center gap-2">{children}</div>
    </div>
  )
}

export function SettingSwitch({
  title,
  description,
  checked,
  onChange,
  disabled = false,
}: {
  title: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <Switch.Group as="div" className={styles.row}>
      <div className="min-w-0 flex-1">
        <Switch.Label className={styles.rowLabel}>{title}</Switch.Label>
        {description && <Switch.Description className={styles.rowDescription}>{description}</Switch.Description>}
      </div>
      <Switch checked={checked} onChange={onChange} disabled={disabled} className="switch-root shrink-0 disabled:opacity-50">
        <span aria-hidden="true" className="switch-thumb" />
      </Switch>
    </Switch.Group>
  )
}

export function SettingRange({
  title,
  value,
  onChange,
  min,
  max,
  step,
  unit = '',
  disabled = false,
}: {
  title: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step: number
  unit?: string
  disabled?: boolean
}) {
  return (
    <SettingRow title={title}>
      <input
        type="range"
        aria-label={title}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        disabled={disabled}
        className="h-8 w-20 cursor-pointer accent-indigo-500 disabled:opacity-40 sm:w-40"
      />
      <output className="w-10 text-right text-xs tabular-nums text-gray-500 dark:text-gray-400">
        {value}
        {unit}
      </output>
    </SettingRow>
  )
}
