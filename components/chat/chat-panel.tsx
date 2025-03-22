"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Send, ChevronLeft, MoreVertical, ImageIcon, Smile } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import type { Message, ChatUser } from "@/types/chat"

interface ChatPanelProps {
  onClose: () => void
  selectedUser: ChatUser | null
}

export default function ChatPanel({ onClose, selectedUser }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Fetch messages for the selected user
    if (selectedUser) {
      // Mock data - replace with actual API call
      const mockMessages: Message[] = [
        {
          id: "1",
          senderId: selectedUser.id,
          receiverId: "me",
          text: "Hey there! How's it going?",
          timestamp: Date.now() - 3600000 * 2,
          read: true,
        },
        {
          id: "2",
          senderId: "me",
          receiverId: selectedUser.id,
          text: "I'm doing well, thanks for asking! How about you?",
          timestamp: Date.now() - 3600000,
          read: true,
        },
        {
          id: "3",
          senderId: selectedUser.id,
          receiverId: "me",
          text: "Pretty good! Just browsing Reddit as usual. Did you see that post on the front page?",
          timestamp: Date.now() - 1800000,
          read: true,
        },
      ]
      setMessages(mockMessages)
    } else {
      setMessages([])
    }
  }, [selectedUser])

  useEffect(() => {
    // Scroll to bottom when messages change
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    if (!inputValue.trim() || !selectedUser) return

    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: "me",
      receiverId: selectedUser.id,
      text: inputValue,
      timestamp: Date.now(),
      read: false,
    }

    setMessages([...messages, newMessage])
    setInputValue("")

    // Mock receiving a reply after a delay
    setTimeout(() => {
      const replyMessage: Message = {
        id: (Date.now() + 1).toString(),
        senderId: selectedUser.id,
        receiverId: "me",
        text: "Thanks for your message! I'll get back to you soon.",
        timestamp: Date.now(),
        read: false,
      }
      setMessages((prev) => [...prev, replyMessage])
    }, 2000)
  }

  if (!selectedUser) return null

  return (
    <div className="flex flex-col h-full bg-background border-l">
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onClose} className="md:hidden">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Avatar className="h-8 w-8">
            <AvatarImage src={selectedUser.avatar} />
            <AvatarFallback>{selectedUser.username.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium text-sm">{selectedUser.username}</div>
            <div className="text-xs text-muted-foreground">{selectedUser.online ? "Online" : "Offline"}</div>
          </div>
        </div>
        <Button variant="ghost" size="icon">
          <MoreVertical className="h-5 w-5" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-3">
        <div className="space-y-4">
          {messages.map((message) => {
            const isMe = message.senderId === "me"
            return (
              <div key={message.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                <div className="flex items-end gap-2 max-w-[80%]">
                  {!isMe && (
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={selectedUser.avatar} />
                      <AvatarFallback>{selectedUser.username.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  )}
                  <div>
                    <div
                      className={cn(
                        "rounded-lg px-3 py-2 text-sm",
                        isMe ? "bg-primary text-primary-foreground" : "bg-muted",
                      )}
                    >
                      {message.text}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div className="p-3 border-t">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="icon" className="shrink-0">
            <ImageIcon className="h-5 w-5" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="shrink-0">
            <Smile className="h-5 w-5" />
          </Button>
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Message"
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!inputValue.trim()} className="shrink-0">
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </div>
  )
}

