import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { UserIcon, Image, Settings2 } from "lucide-react"
import MediaHostsSettings from "./media-hosts"
import Navbar from "@/components/navbar"

export default function SettingsPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container py-6 md:py-8 px-0 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Customize your Reddit experience
          </p>
        </div>

        <Tabs defaultValue="media">
          <TabsList className="w-full md:w-auto">
            <TabsTrigger value="account" className="flex gap-2 items-center">
              <UserIcon className="h-4 w-4" />
              <span>Account</span>
            </TabsTrigger>
            <TabsTrigger value="media" className="flex gap-2 items-center">
              <Image className="h-4 w-4" />
              <span>Media</span>
            </TabsTrigger>
            <TabsTrigger value="general" className="flex gap-2 items-center">
              <Settings2 className="h-4 w-4" />
              <span>General</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="account" className="space-y-4 pt-4">
            <div className="bg-card rounded-lg p-6 border">
              <h2 className="text-xl font-bold mb-4">Account Settings</h2>
              <p className="text-muted-foreground">
                Account settings will be available in a future update.
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="media" className="space-y-4 pt-4">
            <MediaHostsSettings />
          </TabsContent>
          
          <TabsContent value="general" className="space-y-4 pt-4">
            <div className="bg-card rounded-lg p-6 border">
              <h2 className="text-xl font-bold mb-4">General Settings</h2>
              <p className="text-muted-foreground">
                General settings will be available in a future update.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
} 