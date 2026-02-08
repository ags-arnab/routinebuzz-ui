import type { RealtimeChannel } from "@supabase/supabase-js";
import type { CourseData } from "@/types";

import { useEffect, useState, useRef, useCallback } from "react";

import { supabase } from "@/lib/supabase";
import { getSharedRoutine } from "@/utils/api";

interface RealtimeStatus {
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  lastUpdated: Date | null;
}

interface UseSharedRoutineRealtimeReturn {
  status: RealtimeStatus;
  unsubscribe: () => void;
}

interface UseSharedRoutineRealtimeOptions {
  shortCode: string | null;
  isCreator: boolean;
  onUpdate: (courses: CourseData[]) => void;
}

export function useSharedRoutineRealtime({
  shortCode,
  isCreator,
  onUpdate,
}: UseSharedRoutineRealtimeOptions): UseSharedRoutineRealtimeReturn {
  const [status, setStatus] = useState<RealtimeStatus>({
    isConnected: false,
    isConnecting: true,
    connectionError: null,
    lastUpdated: null,
  });

  const channelRef = useRef<RealtimeChannel | null>(null);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const unsubscribe = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }
    if (channelRef.current && supabase) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setStatus({
      isConnected: false,
      isConnecting: false,
      connectionError: null,
      lastUpdated: null,
    });
  }, []);

  const handleRealtimeUpdate = useCallback(async () => {
    if (!shortCode) return;

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(async () => {
      try {
        const result = await getSharedRoutine(shortCode);
        if (result.data && result.data.sections) {
          onUpdate(result.data.sections);
          setStatus((prev) => ({ ...prev, lastUpdated: new Date() }));
        }
      } catch (err) {
        console.error("Error fetching updated routine:", err);
      }
    }, 500);
  }, [shortCode, onUpdate]);

  useEffect(() => {
    if (!supabase || !shortCode || isCreator) return;

    const channelName = `shared-routine:${shortCode}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "shared_routines",
          filter: `short_code=eq.${shortCode}`,
        },
        () => {
          handleRealtimeUpdate();
        },
      )
      .subscribe((channelStatus, err) => {
        console.log("[Realtime] Channel status:", channelStatus, err);
        if (channelStatus === "SUBSCRIBED") {
          setStatus((prev) => ({
            ...prev,
            isConnected: true,
            isConnecting: false,
            connectionError: null,
          }));
        } else if (
          channelStatus === "CLOSED" ||
          channelStatus === "CHANNEL_ERROR" ||
          channelStatus === "TIMED_OUT"
        ) {
          setStatus((prev) => ({
            ...prev,
            isConnected: false,
            isConnecting: false,
            connectionError:
              channelStatus === "CHANNEL_ERROR"
                ? "Connection error"
                : channelStatus === "TIMED_OUT"
                  ? "Connection timed out"
                  : null,
          }));
        }
      });

    channelRef.current = channel;

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (channelRef.current && supabase) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setStatus({
        isConnected: false,
        isConnecting: true,
        connectionError: null,
        lastUpdated: null,
      });
    };
  }, [shortCode, isCreator, handleRealtimeUpdate]);

  return { status, unsubscribe };
}
