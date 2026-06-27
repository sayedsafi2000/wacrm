"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Conversation, ConversationStatus } from "@/types";
import { Search, Plus, Star, Users } from "lucide-react";
import {
  format,
  isToday,
  isYesterday,
  differenceInCalendarDays,
} from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ContactAvatar } from "@/components/contacts/contact-avatar";
import { hasRecentStatus } from "@/lib/contacts/display";

interface ConversationListProps {
  activeConversationId: string | null;
  onSelect: (conversation: Conversation) => void;
  conversations: Conversation[];
  onConversationsLoaded: (conversations: Conversation[]) => void;
  resyncToken?: number;
  className?: string;
}

const STATUS_COLORS: Record<ConversationStatus, string> = {
  open: "bg-emerald-500",
  pending: "bg-amber-500",
  closed: "bg-muted-foreground",
};

type InboxFilter =
  | "all"
  | "unread"
  | "favourites"
  | "groups"
  | ConversationStatus;

const FAVOURITES_STORAGE_KEY = "wacrm:inbox:favourites";

const PRIMARY_CHIPS: { label: string; value: InboxFilter }[] = [
  { label: "All", value: "all" },
  { label: "Unread", value: "unread" },
  { label: "Favourites", value: "favourites" },
  { label: "Groups", value: "groups" },
];

const STATUS_CHIPS: { label: string; value: ConversationStatus }[] = [
  { label: "Open", value: "open" },
  { label: "Pending", value: "pending" },
  { label: "Closed", value: "closed" },
];

function loadFavouriteIds(): Set<string> {
  try {
    const raw = localStorage.getItem(FAVOURITES_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set();
  }
}

function saveFavouriteIds(ids: Set<string>) {
  try {
    localStorage.setItem(
      FAVOURITES_STORAGE_KEY,
      JSON.stringify(Array.from(ids)),
    );
  } catch {
    // best-effort
  }
}

export function ConversationList({
  activeConversationId,
  onSelect,
  conversations,
  onConversationsLoaded,
  resyncToken = 0,
  className,
}: ConversationListProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [loading, setLoading] = useState(true);
  const [favouriteIds, setFavouriteIds] = useState<Set<string>>(() =>
    typeof window === "undefined" ? new Set() : loadFavouriteIds(),
  );

  const onConversationsLoadedRef = useRef(onConversationsLoaded);
  useEffect(() => {
    onConversationsLoadedRef.current = onConversationsLoaded;
  });

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("*, contact:contacts(*)")
        .order("last_message_at", { ascending: false });

      if (cancelled) return;

      if (error) {
        console.error("Failed to fetch conversations:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        setLoading(false);
        return;
      }

      onConversationsLoadedRef.current(data ?? []);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [resyncToken]);

  const unreadCount = useMemo(
    () => conversations.filter((c) => c.unread_count > 0).length,
    [conversations],
  );

  const toggleFavourite = useCallback((convId: string) => {
    setFavouriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(convId)) next.delete(convId);
      else next.add(convId);
      saveFavouriteIds(next);
      return next;
    });
  }, []);

  const filtered = useMemo(() => {
    let result = conversations;

    switch (filter) {
      case "unread":
        result = result.filter((c) => c.unread_count > 0);
        break;
      case "favourites":
        result = result.filter((c) => favouriteIds.has(c.id));
        break;
      case "groups":
        // 1:1 WhatsApp Business inbox — group chats not supported yet.
        result = [];
        break;
      case "open":
      case "pending":
      case "closed":
        result = result.filter((c) => c.status === filter);
        break;
      default:
        break;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((c) => {
        const name = c.contact?.name?.toLowerCase() ?? "";
        const phone = c.contact?.phone?.toLowerCase() ?? "";
        const lastMsg = c.last_message_text?.toLowerCase() ?? "";
        return name.includes(q) || phone.includes(q) || lastMsg.includes(q);
      });
    }

    return result;
  }, [conversations, filter, search, favouriteIds]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
    },
    [],
  );

  const handleSelect = useCallback(
    (conv: Conversation) => {
      onSelect(conv);
    },
    [onSelect],
  );

  const emptyHint =
    filter === "groups"
      ? "Group chats aren't available in WhatsApp Business inbox yet."
      : filter === "favourites"
        ? "Tap the star on a chat to add it to favourites."
        : filter === "unread"
          ? "You're all caught up — no unread chats."
          : "No conversations found";

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col border-r border-[#e9edef] bg-white lg:w-80 lg:border-border lg:bg-card dark:border-[#222d34] dark:bg-[#111b21]",
        className,
      )}
    >
      {/* Search — WhatsApp-style rounded bar */}
      <div className="shrink-0 space-y-2 px-3 pb-2 pt-3 lg:px-3 lg:pt-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8696a0]" />
          <input
            value={search}
            onChange={handleSearchChange}
            placeholder="Search or start new chat"
            className="h-9 w-full rounded-lg border-0 bg-[#f0f2f5] pl-9 pr-3 text-sm text-[#111b21] placeholder-[#8696a0] outline-none focus:ring-1 focus:ring-[#25D366]/40 dark:bg-[#202c33] dark:text-[#e9edef] dark:placeholder-[#8696a0]"
          />
        </div>

        {/* Filter chips — horizontal scroll like WhatsApp mobile */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {PRIMARY_CHIPS.map((chip) => {
            const active = filter === chip.value;
            const showUnreadBadge =
              chip.value === "unread" && unreadCount > 0 && !active;
            return (
              <button
                key={chip.value}
                type="button"
                onClick={() => setFilter(chip.value)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors",
                  active
                    ? "bg-[#d9fdd3] text-[#008069] dark:bg-[#005c4b] dark:text-[#aebac1]"
                    : "bg-[#f0f2f5] text-[#54656f] hover:bg-[#e9edef] dark:bg-[#202c33] dark:text-[#aebac1] dark:hover:bg-[#2a3942]",
                )}
              >
                {chip.label}
                {showUnreadBadge && (
                  <span className="rounded-full bg-[#25D366] px-1.5 py-px text-[11px] font-semibold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
            );
          })}

          {/* + menu for CRM status filters (Open / Pending / Closed) */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors",
                STATUS_CHIPS.some((s) => s.value === filter)
                  ? "bg-[#d9fdd3] text-[#008069] dark:bg-[#005c4b] dark:text-[#aebac1]"
                  : "bg-[#f0f2f5] text-[#54656f] hover:bg-[#e9edef] dark:bg-[#202c33] dark:text-[#aebac1]",
              )}
              aria-label="More filters"
            >
              <Plus className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[10rem]">
              {STATUS_CHIPS.map((opt) => (
                <DropdownMenuItem
                  key={opt.value}
                  onClick={() => setFilter(opt.value)}
                  className={cn(
                    filter === opt.value && "text-[#008069] font-medium",
                  )}
                >
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#25D366] border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            {filter === "groups" && (
              <Users className="mx-auto mb-3 h-10 w-10 text-[#8696a0]" />
            )}
            <p className="text-sm font-medium text-[#111b21] dark:text-[#e9edef]">
              No chats
            </p>
            <p className="mt-1 text-xs text-[#8696a0]">{emptyHint}</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {filtered.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={conv.id === activeConversationId}
                isFavourite={favouriteIds.has(conv.id)}
                onToggleFavourite={toggleFavourite}
                onSelect={handleSelect}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  isFavourite: boolean;
  onToggleFavourite: (id: string) => void;
  onSelect: (conversation: Conversation) => void;
}

function ConversationItem({
  conversation,
  isActive,
  isFavourite,
  onToggleFavourite,
  onSelect,
}: ConversationItemProps) {
  const contact = conversation.contact;
  const displayName = contact?.name || contact?.phone || "Unknown";
  const hasUnread = conversation.unread_count > 0;
  const showStatusRing =
    hasRecentStatus(contact?.status_updated_at) || hasUnread;

  const handleClick = useCallback(() => {
    onSelect(conversation);
  }, [onSelect, conversation]);

  const handleFavouriteClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleFavourite(conversation.id);
    },
    [conversation.id, onToggleFavourite],
  );

  const timeLabel = conversation.last_message_at
    ? formatWhatsAppTime(conversation.last_message_at)
    : "";

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "group flex w-full items-center gap-3 border-b border-[#e9edef]/80 px-3 py-3 text-left transition-colors hover:bg-[#f5f6f6] dark:border-[#222d34] dark:hover:bg-[#202c33]",
        isActive && "bg-[#f0f2f5] dark:bg-[#2a3942]",
      )}
    >
      {/* Avatar */}
      <ContactAvatar
        name={contact?.name}
        phone={contact?.phone}
        avatarUrl={contact?.avatar_url}
        showStatusRing={showStatusRing}
        size="md"
      />

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span
            className={cn(
              "truncate text-[17px] leading-tight text-[#111b21] dark:text-[#e9edef]",
              hasUnread && "font-semibold",
            )}
          >
            {displayName}
          </span>
          <span
            className={cn(
              "shrink-0 text-xs tabular-nums",
              hasUnread
                ? "font-medium text-[#25D366]"
                : "text-[#8696a0]",
            )}
          >
            {timeLabel}
          </span>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p
            className={cn(
              "truncate text-sm text-[#667781] dark:text-[#8696a0]",
              hasUnread && "font-medium text-[#111b21] dark:text-[#d1d7db]",
            )}
          >
            {conversation.last_message_text || "No messages yet"}
          </p>
          <div className="flex shrink-0 items-center gap-1.5">
            {isFavourite && (
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            )}
            {hasUnread && (
              <span className="flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-[#25D366] px-1.5 text-xs font-semibold text-white">
                {conversation.unread_count > 99
                  ? "99+"
                  : conversation.unread_count}
              </span>
            )}
            {conversation.status !== "open" && !hasUnread && (
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  STATUS_COLORS[conversation.status],
                )}
                title={conversation.status}
              />
            )}
            <span
              role="button"
              tabIndex={0}
              onClick={handleFavouriteClick}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleFavouriteClick(e as unknown as React.MouseEvent);
                }
              }}
              aria-label={
                isFavourite ? "Remove from favourites" : "Add to favourites"
              }
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#8696a0] transition-opacity hover:bg-[#e9edef] dark:hover:bg-[#2a3942]",
                // Always visible on touch; hover-reveal on desktop.
                "opacity-100 lg:opacity-0 lg:group-hover:opacity-100",
                isFavourite && "opacity-100",
              )}
            >
              <Star
                className={cn(
                  "h-4 w-4",
                  isFavourite && "fill-amber-400 text-amber-400",
                )}
              />
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

/** WhatsApp-style relative timestamps for the chat list. */
function formatWhatsAppTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();

  if (isToday(date)) return format(date, "h:mm a");
  if (isYesterday(date)) return "Yesterday";
  if (differenceInCalendarDays(now, date) < 7) return format(date, "EEE");
  return format(date, "dd/MM/yyyy");
}
