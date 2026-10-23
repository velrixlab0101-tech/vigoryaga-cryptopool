/**
 * Public display helpers. Winner identities are shown as a human-looking
 * pseudonym plus a shortened address — never the full wallet. The admin panel
 * (payout UI) receives full addresses through authenticated requests and
 * bypasses these helpers, as does the ticket buyer address (never published).
 */

/** Short address for display, e.g. `0x12ab…9f0d`. */
export function maskAddress(address: string): string {
  if (!address) return ''
  if (address.length <= 12) return address
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

const FIRST_NAMES = [
  // North America / English
  'Michael', 'Sarah', 'Daniel', 'Emily', 'James', 'Olivia', 'Lucas', 'Emma',
  'Noah', 'Sophia', 'Ethan', 'Ava', 'Mason', 'Isabella', 'Logan', 'Mia',
  'Alex', 'Taylor', 'Jordan', 'Chris', 'Nathan', 'Grace', 'Ryan', 'Zoe',
  'Kevin', 'Adam', 'Leah', 'Victor', 'Marcus', 'Julia', 'Owen', 'Ruby',
  'Caleb', 'Nora', 'Dylan', 'Aria', 'Tyler', 'Aaron', 'Alice', 'Jason',
  // South Asia
  'Priya', 'Arjun', 'Aisha', 'Rohit', 'Ananya', 'Vikram', 'Meera', 'Rahul',
  'Sanya', 'Aditya', 'Neha', 'Karan', 'Divya', 'Ishaan', 'Pooja',
  // East / Southeast Asia
  'Wei', 'Yuki', 'Hiro', 'Minjun', 'Haruto', 'Sakura', 'Jun', 'Mei',
  'Linh', 'Nguyen', 'Siti', 'Budiono', 'Jihoon', 'Yuna', 'Chen',
  // Middle East / North Africa
  'Omar', 'Fatima', 'Layla', 'Yusuf', 'Amina', 'Karim', 'Noor', 'Zaid',
  'Hana', 'Farid', 'Rania', 'Samir',
  // Europe
  'Liam', 'Chloe', 'Nina', 'Elena', 'Andre', 'Keira', 'Sofia', 'Mateo',
  'Luca', 'Martina', 'Pieter', 'Anouk', 'Lars', 'Freya', 'Sven', 'Ingrid',
  'Dmitri', 'Katya', 'Pavel', 'Olga', 'Sofia', 'Marco', 'Giulia', 'Pierre',
  // Latin America
  'Diego', 'Camila', 'Santiago', 'Valentina', 'Mateus', 'Lucia', 'Sebastian',
  'Renata', 'Tomás', 'Isabela', 'Joaquín', 'Paloma',
  // Africa
  'Kwame', 'Amara', 'Chidi', 'Zainab', 'Sipho', 'Naledi', 'Kofi', 'Adeola',
  'Thabo', 'Ayanda', 'Musa', 'Folake',
]
const LAST_INITIALS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

function hashString(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * Stable human-looking display name derived from the address, e.g.
 * `Marcus T.` The same wallet always gets the same name, which makes the
 * public history look consistent without storing personal data.
 */
export function displayName(address: string): string {
  if (!address) return 'Anonymous'
  const h = hashString(address.toLowerCase())
  const first = FIRST_NAMES[h % FIRST_NAMES.length]
  const initial = LAST_INITIALS[Math.floor(h / FIRST_NAMES.length) % LAST_INITIALS.length]
  return `${first} ${initial}.`
}

/**
 * Public winner payload: replaces the wallet with a pseudonym and a shortened
 * address, keeping every other field (amounts, token, payout hash).
 */
export function publicizeWinners<T extends { wallet: string }>(
  winners: T[] | undefined | null,
): Array<Omit<T, 'wallet'> & { wallet: string; displayName: string }> | undefined | null {
  if (!winners) return winners
  return winners.map((w) => ({
    ...w,
    wallet: maskAddress(w.wallet),
    displayName: displayName(w.wallet),
  }))
}

/** Strips `buyerAddress` from public ticket payloads. */
export function anonymizeTickets<T extends object>(
  tickets: T[] | undefined | null,
): Array<Omit<T, 'buyerAddress'>> | undefined | null {
  if (!tickets) return tickets
  return tickets.map((t) => {
    const rest = { ...t } as T & { buyerAddress?: unknown }
    delete rest.buyerAddress
    return rest as Omit<T, 'buyerAddress'>
  })
}

/** Counts distinct ticket buyers (case-insensitive). Call before stripping. */
export function uniqueBuyers(tickets: { buyerAddress?: string | null }[]): number {
  const set = new Set<string>()
  for (const t of tickets) {
    const a = t.buyerAddress?.toLowerCase()
    if (a) set.add(a)
  }
  return set.size
}

/** Ordinal suffix for place numbers. */
export function ordinal(n: number): string {
  return n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'
}
