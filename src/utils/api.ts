import useSWR from "swr";

import type {
  CourseData,
  CourseListItem,
  ApiResponse,
  SharedRoutine,
  CreateRoutineResponse,
} from "@/types";

export type { CourseData, CourseListItem, ApiResponse, SharedRoutine, CreateRoutineResponse };

const fetcher = async <T>(url: string): Promise<T> => {
  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};

const getApiUrl = (endpoint: string) => {
  return import.meta.env.DEV ? `/api/${endpoint}.json` : `/api/${endpoint}`;
};

export function useCourseList() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<CourseListItem[]>(
    getApiUrl("courses"),
    fetcher,
    {
      refreshInterval: 60000,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      errorRetryCount: 2,
      dedupingInterval: 30000,
      keepPreviousData: true,
      revalidateIfStale: true,
      revalidateOnMount: true,
    },
  );

  return {
    courses: data ?? [],
    loading: isLoading && !data,
    isValidating,
    error: error?.message ?? null,
    refresh: mutate,
  };
}

export function useSelectedCourseData(courseCode: string | null) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<CourseData[]>(
    courseCode ? `${getApiUrl("course-data")}?courseCode=${courseCode}` : null,
    fetcher,
    {
      refreshInterval: 60000,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      errorRetryCount: 2,
      dedupingInterval: 30000,
      keepPreviousData: true,
      revalidateIfStale: true,
    },
  );

  return {
    data: data ?? [],
    loading: isLoading && !data,
    isValidating,
    error: error?.message ?? null,
    refresh: mutate,
  };
}

export async function fetchSectionsByIds(
  sectionIds: number[],
): Promise<ApiResponse<{ sections: unknown[]; found: number }>> {
  try {
    const idsQuery = sectionIds.join(",");
    const apiUrl = import.meta.env.DEV
      ? `/api/sections.json?ids=${idsQuery}`
      : `/api/sections?ids=${idsQuery}`;

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return { data, error: null, status: response.status };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
      status: 0,
    };
  }
}

export async function createSharedRoutine(
  sectionIds: number[],
  creatorSessionId?: string,
): Promise<ApiResponse<CreateRoutineResponse>> {
  const apiUrl = import.meta.env.DEV ? "/api/routine/create.json" : "/api/routine/create";

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionIds, creatorSessionId }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return { data, error: null, status: response.status };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
      status: 0,
    };
  }
}

export async function getSharedRoutine(
  shortCode: string,
): Promise<ApiResponse<SharedRoutine>> {
  const apiUrl = import.meta.env.DEV
    ? `/api/routine/get.json?code=${shortCode}`
    : `/api/routine/get?code=${shortCode}`;

  try {
    const response = await fetch(apiUrl);

    if (!response.ok) {
      if (response.status === 404) {
        return { data: null, error: "Routine not found", status: 404 };
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return { data, error: null, status: response.status };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
      status: 0,
    };
  }
}

export async function updateSharedRoutine(
  shortCode: string,
  sectionIds: number[],
  creatorSessionId: string,
): Promise<ApiResponse<{ success: boolean; message: string }>> {
  const apiUrl = import.meta.env.DEV ? "/api/routine/update.json" : "/api/routine/update";

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shortCode, sectionIds, creatorSessionId }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return { data, error: null, status: response.status };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
      status: 0,
    };
  }
}

async function callRpc<T>(
  fn: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const apiUrl = import.meta.env.DEV ? "/api/rpc.json" : "/api/rpc";
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fn, params }),
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const result = await response.json();
  return result.data;
}

export function useCourseDataOptimized(
  courseCode: string | null,
  minSeats: number = 0,
) {
  const { data, error, isLoading, mutate } = useSWR<CourseData[]>(
    courseCode ? ["course-sections", courseCode, minSeats] : null,
    async () => {
      const result = await callRpc<CourseData[]>("get_course_sections", {
        p_course_code: courseCode,
        p_min_seats: minSeats,
      });
      return result || [];
    },
    {
      refreshInterval: 60000,
      revalidateOnFocus: true,
      keepPreviousData: true,
      dedupingInterval: 30000,
    },
  );

  return {
    data: data ?? [],
    loading: isLoading,
    error: error?.message ?? null,
    refresh: mutate,
  };
}

export function getCreatorSessionId(): string {
  const key = "routinebuzz_session_id";
  let sessionId = localStorage.getItem(key);

  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem(key, sessionId);
  }

  return sessionId;
}

export function useRoutineRefresh(
  routineCourses: CourseData[],
  setRoutineCourses: (courses: CourseData[]) => void,
) {
  const sectionIds = routineCourses.map((c) => c.sectionId);

  const { data, isValidating } = useSWR<{ sections: CourseData[] }>(
    sectionIds.length > 0 ? ["routine-refresh", sectionIds.join(",")] : null,
    async () => {
      const apiUrl = import.meta.env.DEV
        ? `/api/sections.json?ids=${sectionIds.join(",")}`
        : `/api/sections?ids=${sectionIds.join(",")}`;
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    {
      refreshInterval: 60000,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 30000,
      keepPreviousData: true,
      revalidateIfStale: true,
      onSuccess: (freshData) => {
        if (!freshData?.sections || freshData.sections.length === 0) return;

        const updatedCourses = routineCourses.map((oldCourse) => {
          const freshCourse = freshData.sections.find(
            (c: CourseData) => c.sectionId === oldCourse.sectionId,
          );
          return freshCourse || oldCourse;
        });

        const hasChanges = updatedCourses.some((course, index) => {
          const old = routineCourses[index];
          return course.consumedSeat !== old.consumedSeat || course.capacity !== old.capacity;
        });

        if (hasChanges) {
          setRoutineCourses(updatedCourses);
        }
      },
    },
  );

  return {
    isRefreshing: isValidating,
    lastRefreshedData: data,
  };
}

export async function fetchCourseList() {
  const apiUrl = getApiUrl("courses");

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return { data, error: null, status: response.status };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
      status: 0,
    };
  }
}

export async function fetchCourseData(courseCode: string) {
  const apiUrl = `${getApiUrl("course-data")}?courseCode=${courseCode}`;

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return { data, error: null, status: response.status };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
      status: 0,
    };
  }
}
