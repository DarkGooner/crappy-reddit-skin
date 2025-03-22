"use client";

import { useState, useEffect } from "react";
import type { CustomMediaHost } from "@/lib/media-hosts";

/**
 * React hook for managing custom media hosts client-side
 */
export const useCustomMediaHosts = () => {
  const [hosts, setHosts] = useState<CustomMediaHost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHosts = async () => {
      try {
        const response = await fetch('/api/media-hosts');
        if (!response.ok) {
          throw new Error('Failed to fetch media hosts');
        }
        const data = await response.json();
        setHosts(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching media hosts:', error);
        setHosts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHosts();
  }, []);

  const addHost = async (host: Omit<CustomMediaHost, 'id' | 'createdAt'>) => {
    try {
      const response = await fetch('/api/media-hosts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(host),
      });
      
      if (response.ok) {
        const newHost = await response.json();
        setHosts(prev => [...prev, newHost]);
        return newHost;
      }
      return null;
    } catch (error) {
      console.error('Error adding media host:', error);
      return null;
    }
  };

  const deleteHost = async (id: string) => {
    try {
      const response = await fetch(`/api/media-hosts?id=${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setHosts(prev => prev.filter(host => host.id !== id));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting media host:', error);
      return false;
    }
  };

  return { hosts, loading, addHost, deleteHost };
}; 