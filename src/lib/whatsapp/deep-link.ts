/** Digits-only E.164 without leading + — for wa.me links. */
export function whatsAppPhoneDigits(phone: string): string {
  return phone.replace(/\D/g, '')
}

/** Opens WhatsApp chat with this number (user can tap call/video there). */
export function whatsAppChatUrl(phone: string): string {
  return `https://wa.me/${whatsAppPhoneDigits(phone)}`
}
