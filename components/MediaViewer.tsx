"use client"

import type { MediaInfo } from "@/lib/media-utils"
import Image from "next/image"
import { useState, useEffect } from "react"
import VideoPlayer from "./VideoPlayer"

interface MediaViewerProps {
  media: MediaInfo
}

export default function MediaViewer({ media }: MediaViewerProps) {
  const [currentGalleryIndex, setCurrentGalleryIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Preload next and previous gallery images
  useEffect(() => {
    if (media.type === "gallery" && media.gallery?.length) {
      const preloadImage = (url: string) => {
        const img = new Image()
        img.src = url
      }

      // Preload next image
      const nextIndex = (currentGalleryIndex + 1) % media.gallery.length
      preloadImage(media.gallery[nextIndex].url)

      // Preload previous image
      const prevIndex = (currentGalleryIndex - 1 + media.gallery.length) % media.gallery.length
      preloadImage(media.gallery[prevIndex].url)
    }
  }, [currentGalleryIndex, media.gallery])

  const renderGalleryControls = () => {
    if (!media.gallery?.length || media.gallery.length <= 1) return null

    return (
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-2 bg-black bg-opacity-50 rounded-full px-4 py-2">
        <button
          onClick={() => setCurrentGalleryIndex((prev) => Math.max(0, prev - 1))}
          disabled={currentGalleryIndex === 0}
          className="text-white disabled:opacity-50"
          aria-label="Previous image"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-white">
          {currentGalleryIndex + 1} / {media.gallery.length}
        </span>
        <button
          onClick={() => setCurrentGalleryIndex((prev) => Math.min(media.gallery.length - 1, prev + 1))}
          disabled={currentGalleryIndex === media.gallery.length - 1}
          className="text-white disabled:opacity-50"
          aria-label="Next image"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    )
  }

  const renderMedia = () => {
    switch (media.type) {
      case "image":
        return (
          <div className="relative">
            <Image
              src={media.url}
              alt="Post content"
              width={media.width || 800}
              height={media.height || 600}
              className="rounded-lg"
              style={{ maxHeight: "80vh", width: "auto", height: "auto" }}
              loading="eager"
              priority
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setError("Failed to load image")
                setIsLoading(false)
              }}
            />
          </div>
        )

      case "gallery":
        if (!media.gallery?.length) return null

        const currentItem = media.gallery[currentGalleryIndex]
        return (
          <div className="relative">
            <Image
              src={currentItem.url}
              alt={`Gallery item ${currentGalleryIndex + 1}`}
              width={currentItem.width || 800}
              height={currentItem.height || 600}
              className="rounded-lg"
              style={{ maxHeight: "80vh", width: "auto", height: "auto" }}
              loading="eager"
              priority
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setError("Failed to load gallery image")
                setIsLoading(false)
              }}
            />
            {renderGalleryControls()}
          </div>
        )

      case "video":
      case "vreddit":
        return <VideoPlayer media={media} />

      case "gif":
        return (
          <div className="relative">
            <Image
              src={media.url}
              alt="GIF content"
              width={media.width || 800}
              height={media.height || 600}
              className="rounded-lg"
              style={{ maxHeight: "80vh", width: "auto", height: "auto" }}
              loading="eager"
              priority
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setError("Failed to load GIF")
                setIsLoading(false)
              }}
            />
          </div>
        )

      case "youtube":
        return (
          <div className="relative pb-[56.25%] h-0">
            <iframe
              src={media.url}
              className="absolute top-0 left-0 w-full h-full rounded-lg"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
            />
          </div>
        )

      default:
        return <div className="text-center text-gray-500 dark:text-gray-400">Unsupported media type: {media.type}</div>
    }
  }

  return (
    <div className="flex justify-center">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <div className="text-red-500">{error}</div>
        </div>
      )}
      {renderMedia()}
    </div>
  )
}

