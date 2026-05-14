// Muted dark red — avoids neon/eye-strain
const MUTED_RED = '#c0392b'
// Fixed amber for the 7-day warning zone — clearly distinct from both "normal" and "red"
const AMBER = '#b45309'

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').slice(0, 6).padEnd(6, '0')
  return [
    parseInt(clean.slice(0, 2), 16) || 0,
    parseInt(clean.slice(2, 4), 16) || 0,
    parseInt(clean.slice(4, 6), 16) || 0,
  ]
}

function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export interface UrgencyStyle {
  backgroundColor: string
  borderColor: string
  borderWidth: number
}

export function getUrgencyStyle(dueDate: string | null | undefined, myColor: string): UrgencyStyle {
  if (!dueDate) {
    return {
      backgroundColor: rgba(myColor, 0.15),
      borderColor: rgba(myColor, 0.30),
      borderWidth: 1,
    }
  }

  const daysLeft = (new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)

  if (daysLeft < 0) {
    // Overdue — deepest red
    return {
      backgroundColor: rgba(MUTED_RED, 0.40),
      borderColor: rgba(MUTED_RED, 0.90),
      borderWidth: 1,
    }
  }
  if (daysLeft <= 3) {
    // 3-day warning — clear red
    return {
      backgroundColor: rgba(MUTED_RED, 0.28),
      borderColor: rgba(MUTED_RED, 0.65),
      borderWidth: 1,
    }
  }
  if (daysLeft <= 7) {
    // 7-day warning — fixed amber, clearly distinct
    return {
      backgroundColor: rgba(AMBER, 0.25),
      borderColor: rgba(AMBER, 0.65),
      borderWidth: 1,
    }
  }

  // Normal — user color as subtle tint
  return {
    backgroundColor: rgba(myColor, 0.15),
    borderColor: rgba(myColor, 0.30),
    borderWidth: 1,
  }
}
