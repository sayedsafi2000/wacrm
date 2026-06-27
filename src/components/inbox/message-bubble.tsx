"use client";

import { cn } from "@/lib/utils";
import type { Message, MessageReaction } from "@/types";
import {
  Clock,
  Check,
  CheckCheck,
  XCircle,
  MapPin,
  LayoutTemplate,
  CornerDownLeft,
  Ban,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { ReplyQuote } from "./reply-quote";
import { MessageReactions } from "./message-reactions";
import { isMessageDeleted } from "@/lib/inbox/message-delete";
import {
  mapsUrl,
  parseLocationContent,
  locationPreviewLabel,
} from "@/lib/inbox/location-message";
import {
  ChatMediaAudio,
  ChatMediaDocument,
  ChatMediaImage,
  ChatMediaVideo,
} from "./chat-media";

interface MessageBubbleProps {
  message: Message;
  /** Pre-computed quote info for messages that reply to another. */
  reply?: { authorLabel: string; preview: string } | null;
  reactions?: MessageReaction[];
  currentUserId?: string;
  onToggleReaction?: (emoji: string) => void;
}

/** WhatsApp Web bubble palette — independent of the app accent theme. */
const OUTBOUND_BUBBLE =
  "bg-[#D9FDD3] text-[#111B21] dark:bg-[#005C4B] dark:text-[#E9EDEF]";
const INBOUND_BUBBLE =
  "bg-white text-[#111B21] shadow-sm dark:bg-[#202C33] dark:text-[#E9EDEF]";
/** Pending/delivered ticks + timestamps on outbound bubbles. */
const OUTBOUND_META = "text-[#667781] dark:text-white/60";
/** WhatsApp read-receipt blue — visible on both light and dark green bubbles. */
const READ_TICK = "text-[#53BDEB]";

function StatusIcon({ status }: { status: Message["status"] }) {
  switch (status) {
    case "sending":
      return <Clock className={cn("h-3 w-3", OUTBOUND_META)} />;
    case "sent":
      return <Check className={cn("h-3 w-3", OUTBOUND_META)} />;
    case "delivered":
      return <CheckCheck className={cn("h-3 w-3", OUTBOUND_META)} />;
    case "read":
      return <CheckCheck className={cn("h-3 w-3", READ_TICK)} />;
    case "failed":
      return <XCircle className="h-3 w-3 text-red-500" />;
    default:
      return null;
  }
}

function MessageContent({
  message,
  isAgent,
  time,
}: {
  message: Message
  isAgent: boolean
  time: string
}) {
  switch (message.content_type) {
    case "text":
      return (
        <p className="whitespace-pre-wrap break-words text-sm">
          {message.content_text}
        </p>
      );

    case "image":
      return (
        <div>
          {message.media_url ? (
            <ChatMediaImage
              url={message.media_url}
              alt="Shared image"
              downloadName={`image-${message.id.slice(0, 8)}.jpg`}
            />
          ) : (
            <p className="text-xs text-muted-foreground">Image unavailable</p>
          )}
          {message.content_text && (
            <p className="mt-1 whitespace-pre-wrap break-words text-sm">
              {message.content_text}
            </p>
          )}
        </div>
      );

    case "video":
      return (
        <div>
          {message.media_url ? (
            <ChatMediaVideo
              url={message.media_url}
              downloadName={`video-${message.id.slice(0, 8)}.mp4`}
            />
          ) : (
            <p className="text-xs text-muted-foreground">Video unavailable</p>
          )}
          {message.content_text && (
            <p className="mt-1 whitespace-pre-wrap break-words text-sm">
              {message.content_text}
            </p>
          )}
        </div>
      );

    case "audio":
      return (
        <div>
          {message.media_url ? (
            <ChatMediaAudio
              url={message.media_url}
              variant={isAgent ? "outbound" : "inbound"}
              seed={message.id}
              footer={
                <>
                  <span
                    className={cn(
                      "text-[10px] tabular-nums",
                      isAgent ? OUTBOUND_META : "text-muted-foreground",
                    )}
                  >
                    {time}
                  </span>
                  {isAgent && <StatusIcon status={message.status} />}
                </>
              }
            />
          ) : (
            <p className="text-xs text-muted-foreground">Voice message unavailable</p>
          )}
        </div>
      );

    case "document":
      if (!message.media_url) {
        return (
          <p className="text-xs text-muted-foreground">
            {message.content_text || "Document unavailable"}
          </p>
        );
      }
      return (
        <ChatMediaDocument
          url={message.media_url}
          label={message.content_text || "Document"}
        />
      );

    case "template":
      return (
        <div>
          <span className="mb-1 inline-flex items-center gap-1 rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-medium text-primary">
            <LayoutTemplate className="h-3 w-3" />
            Template
          </span>
          {message.content_text && (
            <p className="mt-1 whitespace-pre-wrap break-words text-sm">
              {message.content_text}
            </p>
          )}
        </div>
      );

    case "location": {
      const loc = parseLocationContent(message.content_text);
      const label = loc ? locationPreviewLabel(loc) : "Location shared";
      const href = loc ? mapsUrl(loc) : null;
      return (
        <div className="flex flex-col gap-2">
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            <div className="min-w-0">
              <p className="font-medium">{label}</p>
              {loc?.address && loc.name && loc.address !== loc.name && (
                <p className="text-xs text-muted-foreground">{loc.address}</p>
              )}
            </div>
          </div>
          {href && (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-muted/50 px-3 py-2 text-xs font-medium hover:bg-muted"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open in Google Maps
            </a>
          )}
        </div>
      );
    }

    case "interactive": {
      return (
        <div className="flex flex-col gap-0.5">
          <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            <CornerDownLeft className="h-3 w-3" />
            Button reply
          </span>
          <p className="whitespace-pre-wrap break-words text-sm">
            {message.content_text || "[Interactive reply]"}
          </p>
        </div>
      );
    }

    default:
      return (
        <p className="whitespace-pre-wrap break-words text-sm">
          {message.content_text || "[Unsupported message type]"}
        </p>
      );
  }
}

export function MessageBubble({
  message,
  reply,
  reactions,
  currentUserId,
  onToggleReaction,
}: MessageBubbleProps) {
  const isAgent = message.sender_type === "agent" || message.sender_type === "bot";
  const time = format(new Date(message.created_at), "HH:mm");
  const deleted = isMessageDeleted(message);
  const isAudio = message.content_type === "audio" && !deleted;

  // Row alignment + width cap are owned by <MessageActions> so its hover
  // group matches the bubble's content area, not the full row.
  return (
    <div
      className={cn(
        "flex flex-col",
        isAgent ? "items-end" : "items-start",
      )}
    >
      {deleted ? (
        <div
          className={cn(
            "flex max-w-[75%] items-center gap-1.5 rounded-lg px-3 py-2 text-xs italic text-muted-foreground",
            isAgent ? "rounded-br-md bg-muted/60" : "rounded-bl-md bg-muted/40",
          )}
        >
          <Ban className="h-3.5 w-3.5 shrink-0 opacity-70" />
          <span>This message was deleted</span>
          <span className="ml-1 text-[10px] not-italic opacity-60">{time}</span>
        </div>
      ) : (
      <div
        className={cn(
          "relative rounded-2xl",
          isAudio ? "px-2 py-1.5" : "px-3 py-2",
          isAgent
            ? cn("rounded-br-md", OUTBOUND_BUBBLE)
            : cn("rounded-bl-md", INBOUND_BUBBLE),
        )}
      >
        {reply && (
          <ReplyQuote
            authorLabel={reply.authorLabel}
            preview={reply.preview}
            onPrimary={isAgent}
          />
        )}
        <MessageContent message={message} isAgent={isAgent} time={time} />
        {!isAudio && (
        <div
          className={cn(
            "mt-1 flex items-center gap-1",
            isAgent ? "justify-end" : "justify-start",
          )}
        >
          <span
            className={cn(
              "text-[10px]",
              isAgent ? OUTBOUND_META : "text-muted-foreground",
            )}
          >
            {time}
          </span>
          {isAgent && <StatusIcon status={message.status} />}
        </div>
        )}
      </div>
      )}
      {!deleted && reactions && reactions.length > 0 && onToggleReaction && (
        <MessageReactions
          reactions={reactions}
          currentUserId={currentUserId}
          onToggle={onToggleReaction}
        />
      )}
    </div>
  );
}
