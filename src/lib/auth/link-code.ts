import { randomBytes } from 'crypto'

export function generateLinkCode(): string {
  return randomBytes(4).toString('hex').toUpperCase()
}
