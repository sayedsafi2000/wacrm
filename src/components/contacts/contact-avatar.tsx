'use client'

import { cn } from '@/lib/utils'
import { contactInitials } from '@/lib/contacts/display'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface ContactAvatarProps {
  name?: string | null
  phone?: string
  avatarUrl?: string | null
  /** WhatsApp-style green ring when contact has a recent status. */
  showStatusRing?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE = {
  sm: 'size-10 text-sm',
  md: 'size-[49px] text-base',
  lg: 'size-14 text-lg',
} as const

export function ContactAvatar({
  name,
  phone,
  avatarUrl,
  showStatusRing = false,
  size = 'md',
  className,
}: ContactAvatarProps) {
  const initials = contactInitials(name, phone)

  const avatar = (
    <Avatar
      className={cn(
        SIZE[size],
        'shrink-0 bg-[#dfe5e7] dark:bg-[#2a3942]',
        className,
      )}
    >
      {avatarUrl ? (
        <AvatarImage src={avatarUrl} alt={name || phone || 'Contact'} />
      ) : null}
      <AvatarFallback className="bg-[#dfe5e7] font-medium text-[#54656f] dark:bg-[#2a3942] dark:text-[#aebac1]">
        {initials}
      </AvatarFallback>
    </Avatar>
  )

  if (!showStatusRing) return avatar

  return (
    <div
      className={cn(
        'shrink-0 rounded-full p-[2px]',
        'bg-gradient-to-tr from-[#25D366] via-[#53BDEB] to-[#7c3aed]',
      )}
    >
      {avatar}
    </div>
  )
}
