export interface ChatUser {
  id: string
  username: string
  avatar: string
  lastMessage: string
  timestamp: number
  unreadCount: number
  online: boolean
}

export interface Message {
  id: string
  senderId: string
  receiverId: string
  text: string
  timestamp: number
  read: boolean
}

