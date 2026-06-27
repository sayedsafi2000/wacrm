"use client";

import { useState, type ReactNode } from "react";
import { CornerUpLeft, Copy, SmilePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCan } from "@/hooks/use-can";
import type { Message } from "@/types";
import {
  canDeleteForEveryone,
  canDeleteForMe,
  isMessageDeleted,
} from "@/lib/inbox/message-delete";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

interface MessageActionsProps {
  message: Message;
  onReply: () => void;
  onReact: (emoji: string) => void;
  onDelete: (scope: "me" | "everyone") => void | Promise<void>;
  children: ReactNode;
}

export function MessageActions({
  message,
  onReply,
  onReact,
  onDelete,
  children,
}: MessageActionsProps) {
  const [touchOpen, setTouchOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canSend = useCan("send-messages");
  const deleted = isMessageDeleted(message);
  const showDeleteForMe = canSend && canDeleteForMe(message);
  const showDeleteForEveryone = canSend && canDeleteForEveryone(message);
  const showDelete = showDeleteForMe || showDeleteForEveryone;

  const isAgent =
    message.sender_type === "agent" || message.sender_type === "bot";

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setTouchOpen(true);
  };

  const handleCopy = async () => {
    const text = message.content_text ?? "";
    if (!text) {
      toast.error("Nothing to copy");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch {
      toast.error("Copy failed");
    }
    setTouchOpen(false);
  };

  const handlePickEmoji = (emoji: string) => {
    onReact(emoji);
    setPickerOpen(false);
    setTouchOpen(false);
  };

  const handleReply = () => {
    onReply();
    setTouchOpen(false);
  };

  const handleDelete = async (scope: "me" | "everyone") => {
    setDeleting(true);
    try {
      await onDelete(scope);
      setDeleteOpen(false);
      setTouchOpen(false);
    } catch {
      // Parent toasts errors
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div
        className={cn(
          "flex w-full",
          isAgent ? "justify-end" : "justify-start",
        )}
        onContextMenu={deleted ? undefined : handleContextMenu}
        onBlur={() => setTouchOpen(false)}
      >
        <div className="group/actions relative min-w-0 max-w-[75%]">
          {children}
          {!deleted && (
            <div
              data-touch-open={touchOpen || pickerOpen ? "true" : undefined}
              className={cn(
                "absolute -top-3 z-10 flex h-8 items-center gap-0.5 rounded-full border border-border bg-popover/95 px-1 shadow-md backdrop-blur-sm transition-opacity sm:h-7",
                "opacity-0 group-hover/actions:opacity-100 group-focus-within/actions:opacity-100",
                "data-[touch-open=true]:opacity-100",
                isAgent ? "right-3" : "left-3",
              )}
            >
              <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                <PopoverTrigger
                  className="flex h-7 w-7 items-center justify-center rounded-full text-popover-foreground hover:bg-muted hover:text-foreground sm:h-5 sm:w-5"
                  aria-label="React"
                >
                  <SmilePlus className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                </PopoverTrigger>
                <PopoverContent
                  className="flex w-auto flex-row gap-1 p-1.5"
                  sideOffset={6}
                >
                  {QUICK_EMOJIS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => handlePickEmoji(e)}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-lg leading-none transition-transform hover:scale-125 hover:bg-muted sm:h-8 sm:w-8"
                      aria-label={`React with ${e}`}
                    >
                      {e}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
              <button
                type="button"
                onClick={handleReply}
                className="flex h-7 w-7 items-center justify-center rounded-full text-popover-foreground hover:bg-muted hover:text-foreground sm:h-5 sm:w-5"
                aria-label="Reply"
              >
                <CornerUpLeft className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="flex h-7 w-7 items-center justify-center rounded-full text-popover-foreground hover:bg-muted hover:text-foreground sm:h-5 sm:w-5"
                aria-label="Copy"
              >
                <Copy className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              </button>
              {showDelete && (
                <button
                  type="button"
                  onClick={() => {
                    setDeleteOpen(true);
                    setTouchOpen(false);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-red-400 hover:bg-muted hover:text-red-300 sm:h-5 sm:w-5"
                  aria-label="Delete message"
                >
                  <Trash2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="border-border bg-popover sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete message?</DialogTitle>
            <DialogDescription>
              Choose who should no longer see this message in the inbox.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
            {showDeleteForEveryone && (
              <Button
                variant="destructive"
                disabled={deleting}
                className="h-11 w-full sm:h-10"
                onClick={() => void handleDelete("everyone")}
              >
                Delete for everyone
              </Button>
            )}
            {showDeleteForMe && (
              <Button
                variant="outline"
                disabled={deleting}
                className="h-11 w-full border-border sm:h-10"
                onClick={() => void handleDelete("me")}
              >
                Delete for me
              </Button>
            )}
            <Button
              variant="ghost"
              disabled={deleting}
              className="h-11 w-full sm:h-10"
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
