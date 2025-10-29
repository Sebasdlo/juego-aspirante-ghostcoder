import React from 'react'

type OptionState = 'idle' | 'selected' | 'correct' | 'incorrect'

type Props = {
  label: string            // "A" | "B" | "C" | "D"
  text: string
  state?: OptionState
  disabled?: boolean
  onClick?: () => void
}

export default function OptionButton({ label, text, state = 'idle', disabled, onClick }: Props) {
  const base: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    justifyContent: 'flex-start',
    padding: '14px 16px',
    minHeight: 56,
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,.12)',
    background: 'rgba(20,22,28,.55)',
    color: '#fff',
    cursor: disabled ? 'default' : 'pointer',
    transition: 'background .25s ease',
    width: '100%',
    textAlign: 'left'
  }

  if (state === 'correct') {
    base.background = 'rgba(22,156,115,.22)'
    base.border = '1px solid rgba(80,255,180,.6)'
    base.boxShadow = '0 0 0 1px rgba(80,255,180,.25) inset'
  } else if (state === 'incorrect') {
    base.background = 'rgba(210,85,85,.22)'
    base.border = '1px solid rgba(255,120,120,.65)'
    base.boxShadow = '0 0 0 1px rgba(255,120,120,.25) inset'
  } else if (state === 'selected') {
    base.background = 'rgba(255,255,255,.10)'
  }

  const chip: React.CSSProperties = {
    flex: '0 0 auto',
    fontWeight: 700,
    padding: '8px 14px',
    borderRadius: 999,
    background: 'linear-gradient(90deg, rgba(121,214,255,.35), rgba(178,152,255,.35))',
    border: '1px solid rgba(255,255,255,.18)',
    color: '#fff'
  }

  const textStyle: React.CSSProperties = {
    flex: '1 1 auto',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    opacity: 1,
  }

  return (
    <button
      type="button"
      style={base}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      aria-pressed={state === 'selected' || state === 'correct' || state === 'incorrect'}
      title={text}
    >
      <span style={chip}>Opción {label}</span>
      <span style={textStyle}>{text}</span>
    </button>
  )
}
