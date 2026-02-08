import type { CourseData } from "@/types";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { track } from "@vercel/analytics";
import { addToast } from "@heroui/toast";

import { updateSharedRoutine, getCreatorSessionId } from "@/utils/api";
import { useSharedRoutineRealtime } from "@/hooks/useSharedRoutineRealtime";

const ROUTINE_STORAGE_KEY = "routinebuzz_routine_courses";
const ROUTINE_MODE_KEY = "routinebuzz_routine_mode";
const SELECTED_COURSE_KEY = "routinebuzz_selected_course";
const ROUTINE_FEATURE_INTRO_KEY = "routinebuzz_feature_intro_v2";
const SHARED_ROUTINE_KEY = "routinebuzz_shared_routine";

interface SharedRoutineInfo {
  shortCode: string;
  isCreator: boolean;
}

interface RealtimeStatus {
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  lastUpdated: Date | null;
}

interface RoutineContextType {
  isRoutineMode: boolean;
  setIsRoutineMode: (value: boolean) => void;
  toggleRoutineMode: () => void;
  routineCourses: CourseData[];
  setRoutineCourses: (courses: CourseData[]) => void;
  addCourse: (course: CourseData) => boolean;
  removeCourse: (sectionId: number) => void;
  clearRoutine: () => void;
  selectedCourse: string;
  setSelectedCourse: (course: string) => void;
  showRoutineFeatureIntro: boolean;
  markRoutineFeatureIntroShown: () => void;
  sharedRoutine: SharedRoutineInfo | null;
  setSharedRoutine: (info: SharedRoutineInfo | null) => void;
  isSyncing: boolean;
  realtimeStatus: RealtimeStatus;
  hasLocalChanges: boolean;
}

const RoutineContext = createContext<RoutineContextType | null>(null);

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const saved = localStorage.getItem(key);
    if (saved === null) return fallback;
    return JSON.parse(saved);
  } catch {
    return fallback;
  }
}

export function RoutineProvider({ children }: { children: ReactNode }) {
  const [isRoutineMode, setIsRoutineModeState] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(ROUTINE_MODE_KEY) === "true";
    }
    return false;
  });

  const [routineCourses, setRoutineCoursesState] = useState<CourseData[]>(() => {
    const saved = loadFromStorage<CourseData[] | null>(ROUTINE_STORAGE_KEY, null);
    return Array.isArray(saved) ? saved : [];
  });

  const [selectedCourse, setSelectedCourseState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(SELECTED_COURSE_KEY) || "";
    }
    return "";
  });

  const [showRoutineFeatureIntro, setShowRoutineFeatureIntro] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(ROUTINE_FEATURE_INTRO_KEY) !== "true";
    }
    return false;
  });

  const [sharedRoutine, setSharedRoutineState] = useState<SharedRoutineInfo | null>(() => {
    return loadFromStorage<SharedRoutineInfo | null>(SHARED_ROUTINE_KEY, null);
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncedCoursesRef = useRef<string>("");
  const lastRealtimeUpdateRef = useRef<string>("");

  const [hasLocalChangesState, setHasLocalChangesState] = useState(false);
  const hasLocalChangesRef = useRef(false);
  const unsubscribeRealtimeRef = useRef<(() => void) | null>(null);

  const setHasLocalChanges = useCallback((value: boolean) => {
    hasLocalChangesRef.current = value;
    setHasLocalChangesState(value);
    if (value && unsubscribeRealtimeRef.current) {
      unsubscribeRealtimeRef.current();
    }
  }, []);

  const handleRealtimeUpdate = useCallback((courses: CourseData[]) => {
    if (hasLocalChangesRef.current) return;

    const newSignature = courses.map((c) => c.sectionId).sort().join(",");
    if (newSignature === lastRealtimeUpdateRef.current) return;

    lastRealtimeUpdateRef.current = newSignature;
    setRoutineCoursesState(courses);
    try {
      localStorage.setItem(ROUTINE_STORAGE_KEY, JSON.stringify(courses));
    } catch (e) {
      console.error("Failed to save routine to localStorage:", e);
    }

    addToast({
      title: "Routine Updated",
      description: "The creator has modified this routine",
      color: "primary",
      timeout: 3000,
    });

    track("realtime_update_received", { courseCount: courses.length });
  }, []);

  const { status: realtimeStatus, unsubscribe: unsubscribeRealtime } = useSharedRoutineRealtime({
    shortCode: sharedRoutine?.shortCode ?? null,
    isCreator: (sharedRoutine?.isCreator ?? true) || hasLocalChangesState,
    onUpdate: handleRealtimeUpdate,
  });

  unsubscribeRealtimeRef.current = unsubscribeRealtime;

  const setSharedRoutine = useCallback((info: SharedRoutineInfo | null) => {
    setSharedRoutineState(info);
    if (info) {
      localStorage.setItem(SHARED_ROUTINE_KEY, JSON.stringify(info));
      if (info.isCreator) {
        setHasLocalChanges(false);
      }
    } else {
      localStorage.removeItem(SHARED_ROUTINE_KEY);
      setHasLocalChanges(false);
    }
  }, []);

  const setIsRoutineMode = useCallback((value: boolean) => {
    setIsRoutineModeState(value);
    localStorage.setItem(ROUTINE_MODE_KEY, String(value));
  }, []);

  const toggleRoutineMode = useCallback(() => {
    setIsRoutineModeState((prev) => {
      const newValue = !prev;
      localStorage.setItem(ROUTINE_MODE_KEY, String(newValue));
      track("routine_mode_toggled", { enabled: newValue, method: "navbar" });
      return newValue;
    });
  }, []);

  const setSelectedCourse = useCallback((course: string) => {
    setSelectedCourseState(course);
    localStorage.setItem(SELECTED_COURSE_KEY, course);
  }, []);

  const markRoutineFeatureIntroShown = useCallback(() => {
    setShowRoutineFeatureIntro(false);
    localStorage.setItem(ROUTINE_FEATURE_INTRO_KEY, "true");
  }, []);

  const setRoutineCourses = useCallback((courses: CourseData[]) => {
    setRoutineCoursesState(courses);
    try {
      localStorage.setItem(ROUTINE_STORAGE_KEY, JSON.stringify(courses));
    } catch (e) {
      console.error("Failed to save routine to localStorage:", e);
    }
  }, []);

  const addCourse = useCallback(
    (course: CourseData): boolean => {
      if (routineCourses.find((c) => c.sectionId === course.sectionId)) {
        return false;
      }

      const newCourses = [...routineCourses, course];
      setRoutineCourses(newCourses);

      if (sharedRoutine && !sharedRoutine.isCreator) {
        setHasLocalChanges(true);
      }

      return true;
    },
    [routineCourses, setRoutineCourses, sharedRoutine],
  );

  const removeCourse = useCallback(
    (sectionId: number) => {
      const newCourses = routineCourses.filter((c) => c.sectionId !== sectionId);
      setRoutineCourses(newCourses);

      if (sharedRoutine && !sharedRoutine.isCreator) {
        setHasLocalChanges(true);
      }
    },
    [routineCourses, setRoutineCourses, sharedRoutine],
  );

  const clearRoutine = useCallback(() => {
    setRoutineCourses([]);
    setSharedRoutine(null);
    setHasLocalChanges(false);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("r");
      url.searchParams.delete("routine");
      window.history.replaceState({}, "", url.pathname);
    }
  }, [setRoutineCourses, setSharedRoutine]);

  useEffect(() => {
    if (!sharedRoutine || !sharedRoutine.isCreator) return;
    if (routineCourses.length === 0) return;

    const coursesSignature = routineCourses.map((c) => c.sectionId).sort().join(",");
    if (coursesSignature === lastSyncedCoursesRef.current) return;

    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(async () => {
      setIsSyncing(true);
      try {
        const sectionIds = routineCourses.map((c) => c.sectionId);
        const sessionId = getCreatorSessionId();

        const result = await updateSharedRoutine(
          sharedRoutine.shortCode,
          sectionIds,
          sessionId,
        );

        if (result.data?.success) {
          lastSyncedCoursesRef.current = coursesSignature;
          track("routine_synced", {
            shortCode: sharedRoutine.shortCode,
            courseCount: sectionIds.length,
          });
        } else {
          console.error("Failed to sync routine:", result.error);
        }
      } catch (err) {
        console.error("Error syncing routine:", err);
      } finally {
        setIsSyncing(false);
      }
    }, 2000);

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [routineCourses, sharedRoutine]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === ROUTINE_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setRoutineCoursesState(parsed);
          }
        } catch {}
      }
      if (e.key === ROUTINE_MODE_KEY) {
        setIsRoutineModeState(e.newValue === "true");
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return (
    <RoutineContext.Provider
      value={{
        isRoutineMode,
        setIsRoutineMode,
        toggleRoutineMode,
        routineCourses,
        setRoutineCourses,
        addCourse,
        removeCourse,
        clearRoutine,
        selectedCourse,
        setSelectedCourse,
        showRoutineFeatureIntro,
        markRoutineFeatureIntroShown,
        sharedRoutine,
        setSharedRoutine,
        isSyncing,
        realtimeStatus,
        hasLocalChanges: hasLocalChangesState,
      }}
    >
      {children}
    </RoutineContext.Provider>
  );
}

export function useRoutine() {
  const context = useContext(RoutineContext);
  if (!context) {
    throw new Error("useRoutine must be used within a RoutineProvider");
  }
  return context;
}
