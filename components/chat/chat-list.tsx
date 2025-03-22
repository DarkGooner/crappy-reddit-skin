"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, X, Edit, ChevronLeft } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import type { ChatUser } from "@/types/chat"
import { cn } from "@/lib/utils"

interface ChatListProps {
  onSelectUser: (user: ChatUser) => void
  onClose: () => void
  selectedUser: ChatUser | null
}

export default function ChatList({ onSelectUser, onClose, selectedUser }: ChatListProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [users, setUsers] = useState<ChatUser[]>([])

  useEffect(() => {
    // Mock data - replace with actual API call
    const mockUsers: ChatUser[] = [
      {
        id: "user1",
        username: "RedditFan42",
        avatar: "/placeholder.svg?text=RF",
        lastMessage: "Hey there! How's it going?",
        timestamp: Date.now() - 3600000,
        unreadCount: 0,
        online: true,
      },
      {
        id: "user2",
        username: "CodingWizard",
        avatar: "/placeholder.svg?text=CW",
        lastMessage: "Did you see that new JavaScript framework?",
        timestamp: Date.now() - 86400000,
        unreadCount: 2,
        online: false,
      },
      {
        id: "user3",
        username: "GamingGuru",
        avatar: "/placeholder.svg?text=GG",
        lastMessage: "Let's play some games this weekend!",
        timestamp: Date.now() - 172800000,
        unreadCount: 0,
        online: true,
      },
      {
        id: "user4",
        username: "TechEnthusiast",
        avatar: "/placeholder.svg?text=TE",
        lastMessage: "Check out this new gadget I just got!",
        timestamp: Date.now() - 259200000,
        unreadCount: 5,
        online: false,
      },
      {
        id: "user5",
        username: "MovieBuff",
        avatar: "/placeholder.svg?text=MB",
        lastMessage: "Have you watched the latest Marvel movie?",
        timestamp: Date.now() - 345600000,
        unreadCount: 0,
        online: true,
      },
    ]
    setUsers(mockUsers)
  }, [])

  const filteredUsers = users.filter((user) => user.username.toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <div className="flex flex-col h-full bg-background border-l">
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onClose} className="md:hidden">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h2 className="font-semibold">Chats</h2>
        </div>
        <Button variant="ghost" size="icon">
          <Edit className="h-5 w-5" />
        </Button>
      </div>

      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search chats"
            className="pl-8 pr-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-9 w-9"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => (
              <Button
                key={user.id}
                variant="ghost"
                className={cn("w-full justify-start px-2 py-3 h-auto", selectedUser?.id === user.id && "bg-accent")}
                onClick={() => onSelectUser(user)}
              >
                <div className="flex items-start gap-3 w-full">
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    {user.online && (
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background"></span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium truncate">{user.username}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(user.timestamp), { addSuffix: false })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm text-muted-foreground truncate">{user.lastMessage}</span>
                      {user.unreadCount > 0 && (
                        <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                          {user.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Button>
            ))
          ) : (
            <div className="p-4 text-center text-muted-foreground">No chats found</div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

