"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { MessageSquare } from "lucide-react"
import ChatList from "@/components/chat/chat-list"
import ChatPanel from "@/components/chat/chat-panel"
import type { ChatUser } from "@/types/chat"
import { cn } from "@/lib/utils"

export default function ChatDrawer() {
  const [open, setOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null)
  const [unreadCount, setUnreadCount] = useState(2) // Mock unread count

  const handleSelectUser = (user: ChatUser) => {
    setSelectedUser(user)
  }

  const handleClose = () => {
    setSelectedUser(null)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full">
          <MessageSquare className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
              {unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="p-0 w-full sm:max-w-md">
        <div className="flex h-full">
          <div
            className={cn(
              "w-full transition-all duration-300 ease-in-out",
              selectedUser ? "hidden md:block md:w-1/3" : "w-full",
            )}
          >
            <ChatList onSelectUser={handleSelectUser} onClose={() => setOpen(false)} selectedUser={selectedUser} />
          </div>

          {selectedUser && (
            <div className={cn("w-full transition-all duration-300 ease-in-out", "md:w-2/3")}>
              <ChatPanel onClose={handleClose} selectedUser={selectedUser} />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

