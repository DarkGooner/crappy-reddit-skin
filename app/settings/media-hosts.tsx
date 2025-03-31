"use client"

import React, { useState, useEffect, useRef } from "react"
import { useCustomMediaHosts } from "@/hooks/use-media-hosts"
import type { CustomMediaHost } from "@/lib/media-hosts"
import { extractIdFromUrl, generateEmbedUrl } from "@/lib/media-hosts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Trash, Plus, ExternalLink, Check, AlertCircle, Loader2 } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

// Add global styles for media embeds
const embedStyles = `
  .media-preview {
    max-width: 100%;
  }
  .media-preview img, 
  .media-preview video,
  .media-preview iframe,
  .media-preview embed,
  .media-preview object {
    max-width: 100%;
    height: auto;
  }
  @media (max-width: 640px) {
    .media-preview {
      max-height: 300px;
      overflow-y: auto;
    }
  }
`;

export default function MediaHostsSettings() {
  const { hosts, loading, addHost, deleteHost } = useCustomMediaHosts()
  const [isAddingHost, setIsAddingHost] = useState(false)
  const [newHost, setNewHost] = useState({
    name: "",
    urlPattern: "",
    embedUrlPattern: "",
    sampleUrl: ""
  })
  const [showTester, setShowTester] = useState(false)
  const [testUrl, setTestUrl] = useState("")
  const [testResults, setTestResults] = useState<{
    id: string | null;
    embedUrl: string | null;
    testUrlUsed: string;
    success: boolean;
  } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [previewMode, setPreviewMode] = useState<'direct' | 'iframe'>('iframe')

  // Reference to the preview container
  const previewRef = useRef<HTMLDivElement>(null)

  // Reset preview when closing the tester
  useEffect(() => {
    if (!showTester) {
      setShowPreview(false)
    }
  }, [showTester])

  // Handle script tags in the preview
  useEffect(() => {
    if (showPreview && testResults?.embedUrl && previewRef.current) {
      // First clear any previous content
      const container = previewRef.current
      
      // Execute scripts manually (for script tags that were added via innerHTML)
      const scripts = container.querySelectorAll('script')
      scripts.forEach(oldScript => {
        const newScript = document.createElement('script')
        Array.from(oldScript.attributes).forEach(attr => {
          newScript.setAttribute(attr.name, attr.value)
        })
        newScript.appendChild(document.createTextNode(oldScript.innerHTML))
        oldScript.parentNode?.replaceChild(newScript, oldScript)
      })
    }
  }, [showPreview, testResults])

  // Apply global CSS for embeds
  useEffect(() => {
    // Add global styles for embeds if they don't exist yet
    if (!document.getElementById('media-host-embed-styles')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'media-host-embed-styles';
      styleEl.textContent = embedStyles;
      document.head.appendChild(styleEl);
      
      return () => {
        const existingStyle = document.getElementById('media-host-embed-styles');
        if (existingStyle) {
          existingStyle.remove();
        }
      };
    }
  }, []);

  const resetNewHost = () => {
    setNewHost({
      name: "",
      urlPattern: "",
      embedUrlPattern: "",
      sampleUrl: ""
    })
    setShowTester(false)
    setTestUrl("")
    setTestResults(null)
    setShowPreview(false)
    setPreviewMode('iframe')
  }

  const handleAddHost = async () => {
    if (!newHost.name || !newHost.urlPattern || !newHost.embedUrlPattern) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields.",
        variant: "destructive"
      })
      return
    }

    setIsSubmitting(true)
    try {
      const result = await addHost(newHost)
      if (result) {
        toast({
          title: "Media host added",
          description: `${newHost.name} has been added successfully.`
        })
        setIsAddingHost(false)
        resetNewHost()
      } else {
        toast({
          title: "Failed to add media host",
          description: "An error occurred while adding the media host.",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error adding media host:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteHost = async (id: string) => {
    if (confirm("Are you sure you want to delete this media host?")) {
      setIsDeleting(id)
      try {
        const success = await deleteHost(id)
        if (success) {
          toast({
            title: "Media host deleted",
            description: "The media host has been deleted successfully."
          })
        } else {
          toast({
            title: "Failed to delete media host",
            description: "An error occurred while deleting the media host.",
            variant: "destructive"
          })
        }
      } catch (error) {
        console.error("Error deleting media host:", error)
        toast({
          title: "Error",
          description: "An unexpected error occurred.",
          variant: "destructive"
        })
      } finally {
        setIsDeleting(null)
      }
    }
  }

  const testPatterns = () => {
    if (!testUrl || !newHost.urlPattern || !newHost.embedUrlPattern) {
      toast({
        title: "Missing information",
        description: "Please provide a test URL and complete the pattern fields.",
        variant: "destructive"
      })
      return
    }

    const extractedId = extractIdFromUrl(testUrl, newHost.urlPattern)
    let embedUrl = null

    if (extractedId) {
      embedUrl = generateEmbedUrl(extractedId, newHost.embedUrlPattern)
    }

    setTestResults({
      id: extractedId,
      embedUrl,
      testUrlUsed: testUrl,
      success: !!extractedId && !!embedUrl
    })
  }

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg p-4 sm:p-6 border">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold">Media Hosting Services</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Add support for additional media hosting services to enhance your browsing experience.
            </p>
          </div>
          {!isAddingHost && (
            <Button onClick={() => setIsAddingHost(true)} className="flex items-center gap-2 w-full sm:w-auto flex-shrink-0">
              <Plus className="h-4 w-4" />
              Add New Host
            </Button>
          )}
        </div>

        {isAddingHost && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Add New Media Host</CardTitle>
              <CardDescription>
                Define patterns for a new media hosting service. Use {"{id}"} for the media ID and {"{ext}"} for file extensions (optional).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Service Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., MyGifHost"
                    value={newHost.name}
                    onChange={(e) => setNewHost({ ...newHost, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="urlPattern">URL Pattern</Label>
                  <Input
                    id="urlPattern"
                    placeholder="e.g., https://example.com/{id}.{ext}"
                    value={newHost.urlPattern}
                    onChange={(e) => setNewHost({ ...newHost, urlPattern: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use {"{id}"} where the media ID appears and {"{ext}"} for file extensions (optional).
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="embedUrlPattern">Embed URL Pattern</Label>
                  <Input
                    id="embedUrlPattern"
                    placeholder="e.g., https://example.com/embed/{id}"
                    value={newHost.embedUrlPattern}
                    onChange={(e) => setNewHost({ ...newHost, embedUrlPattern: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use {"{id}"} where the media ID should be inserted in the embed URL.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sampleUrl">Sample URL (optional)</Label>
                  <Input
                    id="sampleUrl"
                    placeholder="e.g., https://example.com/abc123.jpg"
                    value={newHost.sampleUrl}
                    onChange={(e) => setNewHost({ ...newHost, sampleUrl: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    A sample URL to help with testing and documentation.
                  </p>
                </div>
              </div>

              {showTester && (
                <div className="pt-4 border-t mt-4">
                  <h3 className="font-semibold mb-2">Pattern Tester</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="testUrl">Test URL</Label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Input
                          id="testUrl"
                          placeholder="Enter a URL to test"
                          value={testUrl}
                          onChange={(e) => setTestUrl(e.target.value)}
                          className="flex-1"
                        />
                        <Button type="button" onClick={testPatterns}>Test</Button>
                      </div>
                    </div>

                    {testResults && (
                      <Alert variant={testResults.success ? "default" : "destructive"}>
                        <div className="flex items-start">
                          {testResults.success ? (
                            <Check className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                          ) : (
                            <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                          )}
                          <div className="flex-1">
                            <AlertTitle>
                              {testResults.success ? "Pattern Test Successful" : "Pattern Test Failed"}
                            </AlertTitle>
                            <AlertDescription className="mt-2 space-y-2 text-xs break-words">
                              <div><strong>Tested URL:</strong> {testResults.testUrlUsed}</div>
                              {testResults.id ? (
                                <div className="text-green-600 dark:text-green-400">
                                  <strong>ID Extracted Successfully:</strong> {testResults.id}
                                </div>
                              ) : (
                                <div className="text-red-600 dark:text-red-400">
                                  <strong>ID Extraction Failed:</strong> Could not extract ID using the URL pattern.
                                </div>
                              )}

                              {testResults.id && testResults.embedUrl && (
                                <div className="text-green-600 dark:text-green-400">
                                  <strong>Embed URL Generated Successfully.</strong>
                                </div>
                              )}
                              {testResults.id && !testResults.embedUrl && (
                                 <div className="text-red-600 dark:text-red-400">
                                   <strong>Embed URL Generation Failed:</strong> Could not generate embed URL using the embed pattern.
                                 </div>
                              )}

                              {testResults.embedUrl && (
                                <div className="space-y-4 mt-3">
                                  <div>
                                    <strong>Generated Embed URL:</strong>
                                    <pre className="mt-1 bg-muted p-2 rounded text-xs overflow-x-auto whitespace-pre-wrap break-all">
                                      {testResults.embedUrl}
                                    </pre>
                                  </div>

                                  <div>
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2">
                                      <strong>Preview:</strong>
                                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                                        <div className="flex items-center">
                                          <Label htmlFor="previewMode" className="mr-2 text-xs flex-shrink-0">Mode:</Label>
                                          <select
                                            id="previewMode"
                                            value={previewMode}
                                            onChange={(e) => setPreviewMode(e.target.value as 'direct' | 'iframe')}
                                            className="text-xs bg-background border rounded px-2 py-1 max-w-[100px] overflow-hidden text-ellipsis"
                                          >
                                            <option value="iframe">Sandbox (Safe)</option>
                                            <option value="direct">Direct (Unsafe)</option>
                                          </select>
                                        </div>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => setShowPreview(!showPreview)}
                                          className="text-xs"
                                        >
                                          {showPreview ? "Hide Preview" : "Show Preview"}
                                        </Button>
                                      </div>
                                    </div>

                                    {previewMode === 'direct' && showPreview && (
                                      <Alert variant="default" className="mb-2 border-yellow-500/50 text-yellow-700 dark:text-yellow-300 [&>svg]:text-yellow-500">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertTitle>Security Warning</AlertTitle>
                                        <AlertDescription className="text-xs">
                                          Direct preview mode can execute scripts from the embed source and might pose a security risk. Use the Sandbox mode for better isolation.
                                        </AlertDescription>
                                      </Alert>
                                    )}

                                    {showPreview && (
                                      <div className="border rounded p-2 sm:p-4 bg-white dark:bg-gray-800">
                                        {previewMode === 'direct' ? (
                                          <div
                                            ref={previewRef}
                                            dangerouslySetInnerHTML={{ __html: testResults.embedUrl }}
                                            className="media-preview w-full overflow-hidden"
                                            style={{ maxWidth: '100%' }}
                                          />
                                        ) : (
                                          <iframe
                                            srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;padding:0;overflow:hidden;} img,video,iframe,embed,object{max-width:100%;height:auto;display:block;margin:auto;}</style></head><body>${testResults.embedUrl}</body></html>`}
                                            sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
                                            className="w-full min-h-[300px] max-h-[500px] border-0 overflow-auto"
                                            title="Media Preview (Sandboxed)"
                                            allowFullScreen
                                          ></iframe>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </AlertDescription>
                          </div>
                        </div>
                      </Alert>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row justify-between gap-2">
              <div className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={() => setShowTester(!showTester)}
                  className="w-full sm:w-auto"
                >
                  {showTester ? "Hide Tester" : "Test Patterns"}
                </Button>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddingHost(false)
                    resetNewHost()
                  }}
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-none"
                >
                  Cancel
                </Button>
                <Button onClick={handleAddHost} disabled={isSubmitting} className="flex-1 sm:flex-none">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Media Host"
                  )}
                </Button>
              </div>
            </CardFooter>
          </Card>
        )}

        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : hosts.length === 0 ? (
            <div className="bg-muted/50 rounded-lg p-6 text-center border">
              <p className="text-muted-foreground">
                No custom media hosts added yet. Add a new host to support additional media services.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {hosts.map((host) => (
                <div key={host.id} className="bg-card rounded-lg p-4 border">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold break-words">{host.name}</h3>
                        <Badge variant="outline" className="text-xs flex-shrink-0">
                          Custom Host
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Added {new Date(host.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteHost(host.id)}
                      disabled={isDeleting === host.id}
                    >
                      {isDeleting === host.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash className="h-4 w-4" />
                      )}
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="text-sm break-words">
                      <span className="font-medium">URL Pattern:</span>{" "}
                      <code className="bg-muted rounded px-1 py-0.5 text-xs whitespace-pre-wrap break-all">{host.urlPattern}</code>
                    </div>
                    <div className="text-sm break-words">
                      <span className="font-medium">Embed Pattern:</span>{" "}
                      <code className="bg-muted rounded px-1 py-0.5 text-xs whitespace-pre-wrap break-all">{host.embedUrlPattern}</code>
                    </div>
                    {host.sampleUrl && (
                      <div className="text-sm flex items-center gap-1 break-words">
                        <span className="font-medium">Sample:</span>{" "}
                        <a 
                          href={host.sampleUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-600 flex items-center gap-1 break-all"
                        >
                          {host.sampleUrl.length > 60
                            ? host.sampleUrl.substring(0, 60) + "..."
                            : host.sampleUrl}
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 