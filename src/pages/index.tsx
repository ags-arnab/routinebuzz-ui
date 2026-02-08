import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  lazy,
  Suspense,
} from "react";
import { Autocomplete, AutocompleteItem } from "@heroui/autocomplete";
import { Input } from "@heroui/input";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Spinner } from "@heroui/spinner";
import { Button } from "@heroui/button";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/modal";
import { Select, SelectItem } from "@heroui/select";
import {
  Lightbulb,
  Plus,
  Trash2,
  AlertTriangle,
  Sparkles,
  Share2,
  Copy,
  Check,
  Square,
  CheckSquare,
  Radio,
  WifiOff,
  Eye,
  GitFork,
  CalendarPlus,
} from "lucide-react";
import { addToast } from "@heroui/toast";
import { track } from "@vercel/analytics";

import DefaultLayout from "@/layouts/default";
import {
  useCourseList,
  useSelectedCourseData,
  useRoutineRefresh,
  type CourseData,
  createSharedRoutine,
  getSharedRoutine,
  getCreatorSessionId,
} from "@/utils/api";
import { useRoutine } from "@/contexts/routine-context";

const CourseScheduleModal = lazy(
  () => import("@/components/course-schedule-modal"),
);

const CalendarExportModal = lazy(
  () => import("@/components/calendar-export-modal"),
);

const timeSlots = [
  "08:00",
  "09:30",
  "11:00",
  "12:30",
  "14:00",
  "15:30",
  "17:00",
];
const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const convertTo12HourFormat = (time24: string): string => {
  const [hours, minutes] = time24.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;

  return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
};

export default function IndexPage() {
  const {
    isRoutineMode,
    setIsRoutineMode,
    routineCourses,
    setRoutineCourses,
    clearRoutine,
    selectedCourse,
    setSelectedCourse,
    sharedRoutine,
    setSharedRoutine,
    isSyncing,
    realtimeStatus,
    hasLocalChanges,
  } = useRoutine();

  const {
    courses: courseList,
    loading: courseListLoading,
    isValidating: isCoursesRefreshing,
  } = useCourseList();
  const {
    data: courseData,
    loading: courseDataLoading,
    isValidating: isCourseDataRefreshing,
  } = useSelectedCourseData(selectedCourse);

  const { isRefreshing: isRoutineRefreshing } = useRoutineRefresh(
    routineCourses,
    setRoutineCourses,
  );
  const [minSeatsWanted, setMinSeatsWanted] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedCourseData, setSelectedCourseData] =
    useState<CourseData | null>(null);
  const [isCtrlPressed, setIsCtrlPressed] = useState<boolean>(false);
  const [removingCourseIds, setRemovingCourseIds] = useState<Set<number>>(
    new Set(),
  );

  const {
    isOpen: isShareModalOpen,
    onOpen: onShareModalOpen,
    onClose: onShareModalClose,
  } = useDisclosure();
  const [shareableUrl, setShareableUrl] = useState<string>("");
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState<boolean>(false);

  const {
    isOpen: isCalendarModalOpen,
    onOpen: onCalendarModalOpen,
    onClose: onCalendarModalClose,
  } = useDisclosure();

  const [includedFaculties, setIncludedFaculties] = useState<Set<string>>(
    new Set(),
  );
  const [excludedFaculties, setExcludedFaculties] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const shortCode = urlParams.get("r");
    const legacyRoutineParam = urlParams.get("routine");

    if (shortCode) {
      (async () => {
        try {
          const result = await getSharedRoutine(shortCode);

          if (result.data && result.data.sections.length > 0) {
            setRoutineCourses(result.data.sections);
            setIsRoutineMode(true);

            let isExistingCreator = false;
            try {
              const savedRoutine = localStorage.getItem('routinebuzz_shared_routine');
              if (savedRoutine) {
                const parsed = JSON.parse(savedRoutine);
                isExistingCreator = parsed?.shortCode === shortCode && parsed?.isCreator === true;
              }
            } catch {}

            setSharedRoutine({ shortCode, isCreator: isExistingCreator });

            const totalCredits = result.data.sections.reduce(
              (sum: number, c: CourseData) => sum + c.courseCredit,
              0,
            );

            track("shared_routine_loaded", {
              shortCode,
              courseCount: result.data.sections.length,
              totalCredits,
              accessCount: result.data.accessCount || 1,
            });

            addToast({
              title: "Routine Loaded",
              description: `Loaded shared routine with ${result.data.sections.length} courses`,
              color: "success",
              timeout: 3000,
            });
          } else {
            track("shared_routine_not_found", { shortCode });

            addToast({
              title: "Routine Not Found",
              description:
                result.error || "This routine link is invalid or expired",
              color: "warning",
              timeout: 4000,
            });
          }
        } catch (err) {
          console.error("Error loading shared routine:", err);

          track("shared_routine_load_error", {
            shortCode,
            error: err instanceof Error ? err.message : "Unknown error",
          });

          addToast({
            title: "Load Failed",
            description: "Could not load shared routine",
            color: "danger",
            timeout: 4000,
          });
        }
      })();

      return;
    }

    if (!legacyRoutineParam) return;

    let sectionIds: number[] = [];

    try {
      sectionIds = JSON.parse(decodeURIComponent(legacyRoutineParam));
      if (!Array.isArray(sectionIds)) return;
    } catch (e) {
      console.error("Invalid routine param", e);

      return;
    }
    if (sectionIds.length === 0) return;

    const controller = new AbortController();

    (async () => {
      try {
        const idsQuery = sectionIds.join(",");
        const resp = await fetch(`/api/sections?ids=${idsQuery}`, {
          signal: controller.signal,
        });

        if (!resp.ok)
          throw new Error(
            `Failed to fetch shared routine (status ${resp.status})`,
          );
        const json = await resp.json();

        if (json && Array.isArray(json.sections) && json.sections.length > 0) {
          setRoutineCourses(json.sections);
          setIsRoutineMode(true);
          addToast({
            title: "Routine Loaded",
            description: `Loaded shared routine with ${json.sections.length} courses`,
            color: "success",
            timeout: 3000,
          });
        } else {
          addToast({
            title: "Routine Not Found",
            description: "No matching sections for this shared link",
            color: "warning",
            timeout: 4000,
          });
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error("Error loading shared routine:", err);
        addToast({
          title: "Load Failed",
          description: "Could not load shared routine",
          color: "danger",
          timeout: 4000,
        });
      }
    })();

    return () => controller.abort();
  }, [setRoutineCourses, setIsRoutineMode]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey && event.altKey) || event.metaKey) {
        setIsCtrlPressed(true);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (!(event.ctrlKey && event.altKey) && !event.metaKey) {
        setIsCtrlPressed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const conflicts = useMemo(() => {
    const newConflicts = new Set<string>();

    for (let i = 0; i < routineCourses.length; i++) {
      for (let j = i + 1; j < routineCourses.length; j++) {
        const course1 = routineCourses[i];
        const course2 = routineCourses[j];

        course1.sectionSchedule.classSchedules.forEach((schedule1) => {
          course2.sectionSchedule.classSchedules.forEach((schedule2) => {
            if (
              schedule1.day === schedule2.day &&
              schedule1.startTime === schedule2.startTime
            ) {
              newConflicts.add(
                `${course1.sectionId}-${schedule1.day}-${schedule1.startTime.substring(0, 5)}`,
              );
              newConflicts.add(
                `${course2.sectionId}-${schedule2.day}-${schedule2.startTime.substring(0, 5)}`,
              );
            }
          });
        });

        course1.sectionSchedule.classSchedules.forEach((schedule1) => {
          if (course2.labSchedules) {
            course2.labSchedules.forEach((labSchedule2) => {
              const lab2TimeIndex = timeSlots.indexOf(
                labSchedule2.startTime.substring(0, 5),
              );
              const lab2Slots =
                lab2TimeIndex !== -1
                  ? [
                      timeSlots[lab2TimeIndex],
                      timeSlots[lab2TimeIndex + 1],
                    ].filter(Boolean)
                  : [labSchedule2.startTime.substring(0, 5)];

              lab2Slots.forEach((lab2Slot) => {
                if (
                  schedule1.day === labSchedule2.day &&
                  schedule1.startTime.substring(0, 5) === lab2Slot
                ) {
                  newConflicts.add(
                    `${course1.sectionId}-${schedule1.day}-${schedule1.startTime.substring(0, 5)}`,
                  );
                  newConflicts.add(
                    `${course2.sectionId}-lab-${labSchedule2.day}-${lab2Slot}`,
                  );
                }
              });
            });
          }
        });

        // Labs span 2 time slots
        if (course1.labSchedules) {
          course1.labSchedules.forEach((labSchedule1) => {
            const labTimeIndex = timeSlots.indexOf(
              labSchedule1.startTime.substring(0, 5),
            );
            const labSlots =
              labTimeIndex !== -1
                ? [timeSlots[labTimeIndex], timeSlots[labTimeIndex + 1]].filter(
                    Boolean,
                  )
                : [labSchedule1.startTime.substring(0, 5)];

            labSlots.forEach((labSlot) => {
              course2.sectionSchedule.classSchedules.forEach((schedule2) => {
                if (
                  labSchedule1.day === schedule2.day &&
                  labSlot === schedule2.startTime.substring(0, 5)
                ) {
                  newConflicts.add(
                    `${course1.sectionId}-lab-${labSchedule1.day}-${labSlot}`,
                  );
                  newConflicts.add(
                    `${course2.sectionId}-${schedule2.day}-${schedule2.startTime.substring(0, 5)}`,
                  );
                }
              });

              if (course2.labSchedules) {
                course2.labSchedules.forEach((labSchedule2) => {
                  const lab2TimeIndex = timeSlots.indexOf(
                    labSchedule2.startTime.substring(0, 5),
                  );
                  const lab2Slots =
                    lab2TimeIndex !== -1
                      ? [
                          timeSlots[lab2TimeIndex],
                          timeSlots[lab2TimeIndex + 1],
                        ].filter(Boolean)
                      : [labSchedule2.startTime.substring(0, 5)];

                  lab2Slots.forEach((lab2Slot) => {
                    if (
                      labSchedule1.day === labSchedule2.day &&
                      labSlot === lab2Slot
                    ) {
                      newConflicts.add(
                        `${course1.sectionId}-lab-${labSchedule1.day}-${labSlot}`,
                      );
                      newConflicts.add(
                        `${course2.sectionId}-lab-${labSchedule2.day}-${lab2Slot}`,
                      );
                    }
                  });
                });
              }
            });
          });
        }
      }
    }

    return newConflicts;
  }, [routineCourses]);

  const getCoursesForSlot = useCallback(
    (day: string, time: string) => {
      if (!courseData || courseData.length === 0 || !selectedCourse) return [];

      return courseData.filter((course) => {
        const hasSchedule = course.sectionSchedule.classSchedules.some(
          (schedule: { startTime: string; endTime: string; day: string }) => {
            const scheduleDay = schedule.day.toUpperCase();
            const scheduleTime = schedule.startTime.substring(0, 5);

            return scheduleDay === day.toUpperCase() && scheduleTime === time;
          },
        );

        if (!hasSchedule || course.courseCode !== selectedCourse) return false;

        if (minSeatsWanted && parseInt(minSeatsWanted) > 0) {
          const availableSeats = course.capacity - course.consumedSeat;

          if (availableSeats < parseInt(minSeatsWanted)) return false;
        }

        if (includedFaculties.size > 0) {
          const courseFaculties = course.faculties
            ? course.faculties.split(",").map((f) => f.trim())
            : [];
          const hasIncludedFaculty = courseFaculties.some((f) =>
            includedFaculties.has(f),
          );

          if (!hasIncludedFaculty) return false;
        }

        if (excludedFaculties.size > 0) {
          const courseFaculties = course.faculties
            ? course.faculties.split(",").map((f) => f.trim())
            : [];
          const hasExcludedFaculty = courseFaculties.some((f) =>
            excludedFaculties.has(f),
          );

          if (hasExcludedFaculty) return false;
        }

        return true;
      });
    },
    [
      courseData,
      selectedCourse,
      minSeatsWanted,
      includedFaculties,
      excludedFaculties,
    ],
  );

  const getRoutineCoursesForSlot = useCallback(
    (day: string, time: string) => {
      return routineCourses.filter((course) => {
        const hasClassSchedule = course.sectionSchedule.classSchedules.some(
          (schedule) => {
            const scheduleDay = schedule.day.toUpperCase();
            const scheduleTime = schedule.startTime.substring(0, 5);

            return scheduleDay === day.toUpperCase() && scheduleTime === time;
          },
        );

        const hasLabSchedule = course.labSchedules?.some((schedule) => {
          const scheduleDay = schedule.day.toUpperCase();
          const scheduleTime = schedule.startTime.substring(0, 5);
          const currentTimeIndex = timeSlots.indexOf(time);
          const labTimeIndex = timeSlots.indexOf(scheduleTime);

          return (
            scheduleDay === day.toUpperCase() &&
            (scheduleTime === time ||
              (labTimeIndex !== -1 && currentTimeIndex === labTimeIndex + 1))
          );
        });

        return hasClassSchedule || hasLabSchedule;
      });
    },
    [routineCourses],
  );

  const isLabSpanningSlot = (day: string, time: string) => {
    const timeIndex = timeSlots.indexOf(time);

    if (timeIndex === -1 || timeIndex === 0) return false;

    const previousTime = timeSlots[timeIndex - 1];

    return routineCourses.some((course) => {
      return course.labSchedules?.some((schedule) => {
        const scheduleDay = schedule.day.toUpperCase();
        const scheduleTime = schedule.startTime.substring(0, 5);

        return (
          scheduleDay === day.toUpperCase() && scheduleTime === previousTime
        );
      });
    });
  };

  const formatCourseInfo = useCallback((course: CourseData) => {
    const availableSeats = course.capacity - course.consumedSeat;
    const faculties = course.faculties || "TBA";

    return `${course.sectionName}-${faculties}-${availableSeats}`;
  }, []);

  const uniqueCourses = useMemo(() => {
    const seen = new Set<string>();

    return courseList.filter((course) => {
      if (seen.has(course.courseCode)) {
        return false;
      }
      seen.add(course.courseCode);

      return true;
    });
  }, [courseList]);

  const uniqueFaculties = useMemo(() => {
    if (!selectedCourse || !courseData || courseData.length === 0) return [];

    const facultySet = new Set<string>();

    courseData
      .filter((section) => section.courseCode === selectedCourse)
      .forEach((section) => {
        if (section.faculties) {
          const faculties = section.faculties
            .split(",")
            .map((f) => f.trim())
            .filter(Boolean);

          faculties.forEach((f) => facultySet.add(f));
        }
      });

    return Array.from(facultySet).sort();
  }, [courseData, selectedCourse]);

  useEffect(() => {
    setIncludedFaculties(new Set());
    setExcludedFaculties(new Set());
  }, [selectedCourse]);

  const addCourseToRoutine = useCallback(
    (course: CourseData) => {
      if (!routineCourses.find((c) => c.sectionId === course.sectionId)) {
        const newRoutineCourses = [...routineCourses, course];
        const hasConflict = checkForConflicts(newRoutineCourses, course);

        setRoutineCourses(newRoutineCourses);

        track("course_added_to_routine", {
          courseCode: course.courseCode,
          sectionName: course.sectionName,
          hasConflict,
          totalCourses: newRoutineCourses.length,
          totalCredits: newRoutineCourses.reduce(
            (sum, c) => sum + c.courseCredit,
            0,
          ),
        });

        if (hasConflict) {
          addToast({
            title: "Schedule Conflict!",
            description: `${course.courseCode} conflicts with existing courses`,
            color: "danger",
            timeout: 4000,
          });
        } else {
          addToast({
            title: "Course Added",
            description: `${course.courseCode} added to routine successfully`,
            color: "success",
            timeout: 2000,
          });
        }
      }
    },
    [routineCourses, setRoutineCourses],
  );

  const checkForConflicts = useCallback(
    (courses: CourseData[], newCourse: CourseData) => {
      for (const existingCourse of courses) {
        if (existingCourse.sectionId === newCourse.sectionId) continue;

        for (const schedule1 of newCourse.sectionSchedule.classSchedules) {
          for (const schedule2 of existingCourse.sectionSchedule
            .classSchedules) {
            if (
              schedule1.day === schedule2.day &&
              schedule1.startTime === schedule2.startTime
            ) {
              return true;
            }
          }

          if (existingCourse.labSchedules) {
            for (const labSchedule of existingCourse.labSchedules) {
              const labTimeIndex = timeSlots.indexOf(
                labSchedule.startTime.substring(0, 5),
              );
              const labSlots =
                labTimeIndex !== -1
                  ? [
                      timeSlots[labTimeIndex],
                      timeSlots[labTimeIndex + 1],
                    ].filter(Boolean)
                  : [labSchedule.startTime.substring(0, 5)];

              for (const labSlot of labSlots) {
                if (
                  schedule1.day === labSchedule.day &&
                  schedule1.startTime.substring(0, 5) === labSlot
                ) {
                  return true;
                }
              }
            }
          }
        }

        if (newCourse.labSchedules) {
          for (const labSchedule1 of newCourse.labSchedules) {
            const labTimeIndex = timeSlots.indexOf(
              labSchedule1.startTime.substring(0, 5),
            );
            const labSlots =
              labTimeIndex !== -1
                ? [timeSlots[labTimeIndex], timeSlots[labTimeIndex + 1]].filter(
                    Boolean,
                  )
                : [labSchedule1.startTime.substring(0, 5)];

            for (const labSlot of labSlots) {
              for (const schedule2 of existingCourse.sectionSchedule
                .classSchedules) {
                if (
                  labSchedule1.day === schedule2.day &&
                  labSlot === schedule2.startTime.substring(0, 5)
                ) {
                  return true;
                }
              }

              if (existingCourse.labSchedules) {
                for (const labSchedule2 of existingCourse.labSchedules) {
                  const lab2TimeIndex = timeSlots.indexOf(
                    labSchedule2.startTime.substring(0, 5),
                  );
                  const lab2Slots =
                    lab2TimeIndex !== -1
                      ? [
                          timeSlots[lab2TimeIndex],
                          timeSlots[lab2TimeIndex + 1],
                        ].filter(Boolean)
                      : [labSchedule2.startTime.substring(0, 5)];

                  for (const lab2Slot of lab2Slots) {
                    if (
                      labSchedule1.day === labSchedule2.day &&
                      labSlot === lab2Slot
                    ) {
                      return true;
                    }
                  }
                }
              }
            }
          }
        }
      }

      return false;
    },
    [],
  );

  const removeCourseFromRoutine = useCallback(
    (courseId: number) => {
      setRemovingCourseIds((prev) => new Set(prev).add(courseId));

      setTimeout(() => {
        setRoutineCourses(
          routineCourses.filter((c) => c.sectionId !== courseId),
        );
        setRemovingCourseIds((prev) => {
          const next = new Set(prev);

          next.delete(courseId);

          return next;
        });
      }, 200);
    },
    [routineCourses, setRoutineCourses],
  );

  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);

  const handleTouchStart = useCallback(
    (course: CourseData) => {
      if (!isRoutineMode) return;

      longPressTriggeredRef.current = false;
      longPressTimerRef.current = setTimeout(() => {
        longPressTriggeredRef.current = true;
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
        addCourseToRoutine(course);
      }, 500);
    },
    [isRoutineMode, addCourseToRoutine],
  );

  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleTouchMove = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleChipClick = (course: CourseData, event?: React.MouseEvent) => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;

      return;
    }

    if (
      (isCtrlPressed ||
        (event && ((event.ctrlKey && event.altKey) || event.metaKey))) &&
      isRoutineMode
    ) {
      addCourseToRoutine(course);

      return;
    }

    setSelectedCourseData(course);
    setIsModalOpen(true);
  };

  const handleRoutineChipClick = (course: CourseData) => {
    removeCourseFromRoutine(course.sectionId);
  };

  const generateShareableLink = async () => {
    if (routineCourses.length === 0) {
      addToast({
        title: "No Routine",
        description: "Add courses to your routine before sharing",
        color: "warning",
        timeout: 3000,
      });

      return;
    }

    if (sharedRoutine && sharedRoutine.isCreator) {
      const url = `${window.location.origin}/?r=${sharedRoutine.shortCode}`;

      setShareableUrl(url);
      setIsCopied(false);
      onShareModalOpen();

      return;
    }

    setIsGeneratingLink(true);
    setIsCopied(false);

    const totalCredits = routineCourses.reduce(
      (sum, c) => sum + c.courseCredit,
      0,
    );
    const courseCodes = routineCourses.map((c) => c.courseCode);

    try {
      const sectionIds = routineCourses.map((course) => course.sectionId);
      const sessionId = getCreatorSessionId();

      const result = await createSharedRoutine(sectionIds, sessionId);

      if (result.data && result.data.shortCode) {
        const url = `${window.location.origin}/?r=${result.data.shortCode}`;

        setSharedRoutine({ shortCode: result.data.shortCode, isCreator: true });
        setShareableUrl(url);

        window.history.replaceState({}, "", `/?r=${result.data.shortCode}`);

        track("routine_shared", {
          shortCode: result.data.shortCode,
          courseCount: routineCourses.length,
          totalCredits,
          courses: courseCodes.join(","),
        });

        onShareModalOpen();
      } else {
        throw new Error(result.error || "Failed to create share link");
      }
    } catch (err) {
      console.error("Error creating share link:", err);

      track("routine_share_failed", {
        courseCount: routineCourses.length,
        error: err instanceof Error ? err.message : "Unknown error",
      });

      const routineIds = routineCourses.map((course) => course.sectionId);
      const routineParam = encodeURIComponent(JSON.stringify(routineIds));
      const url = `${window.location.origin}${window.location.pathname}?routine=${routineParam}`;

      setShareableUrl(url);
      onShareModalOpen();
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareableUrl);
      setIsCopied(true);
      addToast({
        title: "Copied!",
        description: "Link copied to clipboard",
        color: "success",
        timeout: 2000,
      });
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      addToast({
        title: "Failed to copy",
        description: "Please copy the link manually",
        color: "danger",
        timeout: 3000,
      });
    }
  };

  const handleSelectionChange = (key: React.Key | null) => {
    setSelectedCourse(key as string);
    if (key) {
      track("course_selected", { courseCode: key as string });
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedCourseData(null);
  };

  if (courseListLoading) {
    return (
      <DefaultLayout>
        <section className="flex flex-col gap-6 py-4">
          <div className="max-w-full">
            <Card>
              <CardHeader className="pb-0 flex justify-center">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-center">
                    {isRoutineMode ? "Routine Builder" : "Course Schedule"}
                  </h1>
                  {isRoutineMode && (
                    <div className="flex items-center gap-2">
                      <Sparkles
                        className="text-primary animate-pulse"
                        size={20}
                      />
                      <div className="flex items-center gap-2">
                        <Chip color="primary" size="sm" variant="flat">
                          {routineCourses.length} courses
                        </Chip>
                        <Chip color="secondary" size="sm" variant="flat">
                          {routineCourses.reduce(
                            (sum, course) => sum + course.courseCredit,
                            0,
                          )}{" "}
                          credits
                        </Chip>
                        {conflicts.size > 0 && (
                          <Chip
                            color="danger"
                            size="sm"
                            startContent={<AlertTriangle size={14} />}
                            variant="flat"
                          >
                            {conflicts.size} conflicts
                          </Chip>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardBody className="pt-4">
                <div className="flex flex-col items-center justify-center py-16 space-y-4">
                  <Spinner color="primary" size="lg" />
                  <div className="text-center space-y-2">
                    <p className="text-lg font-medium text-default-700">
                      Loading course list...
                    </p>
                    <p className="text-sm text-default-500">
                      Getting available courses
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </section>
      </DefaultLayout>
    );
  }

  return (
    <DefaultLayout>
      <section className="flex flex-col gap-6 py-4">
        <div className="max-w-full">
          <Card>
            <CardHeader className="pb-0 flex justify-center">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-center">
                  Course Schedule
                </h1>
                {(isCoursesRefreshing || isCourseDataRefreshing) && (
                  <Spinner color="primary" size="sm" />
                )}
              </div>
            </CardHeader>
            <CardBody className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <Autocomplete
                  defaultFilter={(textValue, inputValue) => {
                    const lowerInput = inputValue.toLowerCase();

                    return textValue.toLowerCase().includes(lowerInput);
                  }}
                  defaultItems={uniqueCourses}
                  inputProps={{
                    classNames: {
                      input: "text-black dark:text-white",
                    },
                  }}
                  label="Course Name"
                  listboxProps={{
                    emptyContent: "No courses found",
                  }}
                  placeholder="Search for a course"
                  selectedKey={selectedCourse}
                  onSelectionChange={handleSelectionChange}
                >
                  {(course) => (
                    <AutocompleteItem
                      key={course.courseCode}
                      classNames={{
                        base: "text-black dark:text-white",
                        title: "text-black dark:text-white",
                      }}
                      textValue={course.courseCode}
                    >
                      <span className="text-black dark:text-white font-medium">
                        {course.courseCode}
                      </span>
                    </AutocompleteItem>
                  )}
                </Autocomplete>

                <Input
                  label="Minimum Seats Wanted"
                  placeholder="Enter minimum seats"
                  type="number"
                  value={minSeatsWanted}
                  onValueChange={setMinSeatsWanted}
                />
              </div>

              {selectedCourse && uniqueFaculties.length > 0 && (
                <div className="space-y-4 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                      description={`${uniqueFaculties.length} faculties available`}
                      label="Include Faculties"
                      placeholder="All faculties"
                      renderValue={(items) => {
                        return (
                          <div className="flex flex-wrap gap-1">
                            {items.map((item) => (
                              <Chip
                                key={item.key}
                                color="success"
                                size="sm"
                                variant="flat"
                              >
                                {item.textValue}
                              </Chip>
                            ))}
                          </div>
                        );
                      }}
                      selectedKeys={includedFaculties}
                      selectionMode="multiple"
                      onSelectionChange={(keys) =>
                        setIncludedFaculties(
                          new Set(Array.from(keys as Set<string>)),
                        )
                      }
                    >
                      {uniqueFaculties
                        .filter((f) => !excludedFaculties.has(f))
                        .map((faculty) => (
                          <SelectItem
                            key={faculty}
                            startContent={
                              includedFaculties.has(faculty) ? (
                                <CheckSquare
                                  className="text-success"
                                  size={16}
                                />
                              ) : (
                                <Square
                                  className="text-default-400"
                                  size={16}
                                />
                              )
                            }
                            textValue={faculty}
                          >
                            {faculty}
                          </SelectItem>
                        ))}
                    </Select>

                    <Select
                      description={`${uniqueFaculties.length} faculties available`}
                      label="Exclude Faculties"
                      placeholder="None excluded"
                      renderValue={(items) => {
                        return (
                          <div className="flex flex-wrap gap-1">
                            {items.map((item) => (
                              <Chip
                                key={item.key}
                                color="danger"
                                size="sm"
                                variant="flat"
                              >
                                {item.textValue}
                              </Chip>
                            ))}
                          </div>
                        );
                      }}
                      selectedKeys={excludedFaculties}
                      selectionMode="multiple"
                      onSelectionChange={(keys) =>
                        setExcludedFaculties(
                          new Set(Array.from(keys as Set<string>)),
                        )
                      }
                    >
                      {uniqueFaculties
                        .filter((f) => !includedFaculties.has(f))
                        .map((faculty) => (
                          <SelectItem
                            key={faculty}
                            startContent={
                              excludedFaculties.has(faculty) ? (
                                <CheckSquare
                                  className="text-danger"
                                  size={16}
                                />
                              ) : (
                                <Square
                                  className="text-default-400"
                                  size={16}
                                />
                              )
                            }
                            textValue={faculty}
                          >
                            {faculty}
                          </SelectItem>
                        ))}
                    </Select>
                  </div>

                  {(includedFaculties.size > 0 ||
                    excludedFaculties.size > 0) && (
                    <div className="flex flex-wrap items-center gap-2">
                      {Array.from(includedFaculties).map((faculty) => (
                        <Chip
                          key={`include-${faculty}`}
                          color="success"
                          size="sm"
                          variant="flat"
                          onClose={() => {
                            const newSet = new Set(includedFaculties);

                            newSet.delete(faculty);
                            setIncludedFaculties(newSet);
                          }}
                        >
                          {faculty}
                        </Chip>
                      ))}

                      {Array.from(excludedFaculties).map((faculty) => (
                        <Chip
                          key={`exclude-${faculty}`}
                          color="danger"
                          size="sm"
                          variant="flat"
                          onClose={() => {
                            const newSet = new Set(excludedFaculties);

                            newSet.delete(faculty);
                            setExcludedFaculties(newSet);
                          }}
                        >
                          {faculty}
                        </Chip>
                      ))}

                      <Button
                        className="text-xs"
                        color="default"
                        size="sm"
                        variant="light"
                        onPress={() => {
                          setIncludedFaculties(new Set());
                          setExcludedFaculties(new Set());
                        }}
                      >
                        Clear all
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="flex-1 p-3 bg-primary-50 border border-primary-200 rounded-lg">
                  <div className="flex items-start gap-2 text-primary-700">
                    <Lightbulb
                      className="text-primary-600 mt-0.5 shrink-0"
                      size={16}
                    />
                    <span className="text-sm">
                      {selectedCourse
                        ? "Click on any course chip below to view detailed schedule information"
                        : "Select a course above to view its schedule"}
                    </span>
                  </div>
                </div>

                <div
                  className={`flex-1 p-3 rounded-lg border ${isRoutineMode ? "bg-success-50 border-success-200" : "bg-default-50 border-default-200"}`}
                >
                  <div
                    className={`flex items-start gap-2 ${isRoutineMode ? "text-success-700" : "text-default-600"}`}
                  >
                    <Sparkles
                      className={`mt-0.5 shrink-0 ${isRoutineMode ? "text-success-600" : "text-default-400"}`}
                      size={16}
                    />
                    <div className="text-sm">
                      {isRoutineMode ? (
                        <>
                          <span className="font-medium">
                            Routine Mode Active!
                          </span>
                          <span className="hidden sm:inline">
                            {" "}
                            Hold Ctrl+Alt (Win) or ⌘ Cmd (Mac) + Click to add
                            courses.
                          </span>
                          <span className="sm:hidden">
                            {" "}
                            Long press on a chip to add to routine.
                          </span>
                        </>
                      ) : (
                        <span>
                          Enable <strong>Routine Mode</strong> from the navbar
                          to build your schedule
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-content1 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-default-100 border-b border-default-200">
                        <th className="p-2 md:p-4 font-semibold text-center text-default-700 border-r border-default-200 whitespace-nowrap text-xs md:text-sm min-w-[60px] md:min-w-[80px]">
                          Time/Day
                        </th>
                        {days.map((day) => (
                          <th
                            key={day}
                            className="p-2 md:p-4 font-semibold text-center text-default-700 border-r border-default-200 last:border-r-0 whitespace-nowrap text-xs md:text-sm min-w-[80px] md:min-w-[110px]"
                          >
                            <span className="hidden md:inline">{day}</span>
                            <span className="md:hidden">
                              {day.substring(0, 3)}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {timeSlots.map((time, timeIndex) => (
                        <tr
                          key={time}
                          className={`border-b border-default-200 ${timeIndex % 2 === 0 ? "bg-content1" : "bg-content2"}`}
                        >
                          <td className="p-1 md:p-4 font-medium text-center bg-default-50 text-default-700 border-r border-default-200 whitespace-nowrap text-[10px] md:text-sm min-w-[60px] md:min-w-[80px]">
                            {convertTo12HourFormat(time)}
                          </td>

                          {days.map((day) => {
                            const coursesInSlot = getCoursesForSlot(day, time);

                            return (
                              <td
                                key={`${time}-${day}`}
                                className="p-1 md:p-3 border-r border-default-200 last:border-r-0 align-middle min-w-[80px] md:min-w-[110px]"
                              >
                                <div className="space-y-1 md:space-y-2 flex flex-col items-center">
                                  {coursesInSlot.map((course, index) => {
                                    const info = formatCourseInfo(course);
                                    const availableSeats =
                                      course.capacity - course.consumedSeat;
                                    const isSelected = routineCourses.some(
                                      (rc) => rc.sectionId === course.sectionId,
                                    );

                                    let chipColor:
                                      | "success"
                                      | "danger"
                                      | "primary" =
                                      availableSeats > 0 ? "success" : "danger";

                                    if (isSelected) chipColor = "primary";

                                    return (
                                      <Chip
                                        key={`${course.sectionId}-${index}`}
                                        className={`text-[9px] md:text-xs font-medium text-center cursor-pointer hover:opacity-80 hover:scale-105 transition-all duration-150 select-none px-1.5 md:px-2 whitespace-nowrap ${
                                          isCtrlPressed && isRoutineMode
                                            ? "ring-2 ring-warning ring-offset-1 shadow-lg"
                                            : ""
                                        } ${isRoutineMode && !isSelected ? "active:scale-95" : ""} ${isSelected ? "scale-100" : ""}`}
                                        color={chipColor}
                                        endContent={
                                          isCtrlPressed && isRoutineMode ? (
                                            <Plus size={12} />
                                          ) : undefined
                                        }
                                        size="sm"
                                        variant={isSelected ? "solid" : "flat"}
                                        onClick={(event) =>
                                          handleChipClick(course, event)
                                        }
                                        onTouchEnd={handleTouchEnd}
                                        onTouchMove={handleTouchMove}
                                        onTouchStart={() =>
                                          handleTouchStart(course)
                                        }
                                      >
                                        {info}
                                      </Chip>
                                    );
                                  })}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {selectedCourse && courseDataLoading && (
                <Card className="mt-4">
                  <CardBody className="text-center py-8">
                    <Spinner color="primary" />
                    <p className="text-default-500 mt-2">
                      Loading {selectedCourse} sections...
                    </p>
                  </CardBody>
                </Card>
              )}

              {selectedCourse &&
                !courseDataLoading &&
                courseData.length === 0 && (
                  <Card className="mt-4">
                    <CardBody className="text-center py-8">
                      <p className="text-default-500">
                        No sections found for {selectedCourse}.
                      </p>
                    </CardBody>
                  </Card>
                )}
            </CardBody>
          </Card>
        </div>

        {isRoutineMode && (
          <div className="max-w-full">
            <Card>
              <CardHeader className="pb-0">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 w-full">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold">Your Routine</h2>
                    {isRoutineRefreshing ? (
                      <Spinner color="primary" size="sm" />
                    ) : (
                      <Sparkles
                        className="text-primary animate-pulse"
                        size={16}
                      />
                    )}
                    <Chip color="primary" size="sm" variant="flat">
                      {routineCourses.length} courses
                    </Chip>
                    <Chip color="secondary" size="sm" variant="flat">
                      {routineCourses.reduce(
                        (sum, course) => sum + course.courseCredit,
                        0,
                      )}{" "}
                      cr
                    </Chip>
                    {conflicts.size > 0 && (
                      <Chip
                        color="danger"
                        size="sm"
                        startContent={<AlertTriangle size={12} />}
                        variant="flat"
                      >
                        {conflicts.size}
                      </Chip>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {sharedRoutine && !sharedRoutine.isCreator && (
                      <>
                        {hasLocalChanges ? (
                          <Chip
                            className="text-xs"
                            color="warning"
                            size="sm"
                            startContent={<GitFork size={12} />}
                            variant="flat"
                          >
                            Modified
                          </Chip>
                        ) : (
                          <>
                            <Chip
                              className="text-xs"
                              color="secondary"
                              size="sm"
                              startContent={<Eye size={12} />}
                              variant="flat"
                            >
                              Viewing
                            </Chip>
                            <Chip
                              className="text-xs"
                              color={
                                realtimeStatus.isConnected ? "success" : "warning"
                              }
                              size="sm"
                              startContent={
                                realtimeStatus.isConnected ? (
                                  <Radio className="animate-pulse" size={12} />
                                ) : (
                                  <WifiOff size={12} />
                                )
                              }
                              variant="flat"
                            >
                              {realtimeStatus.isConnected
                                ? "Live"
                                : realtimeStatus.isConnecting
                                  ? "Connecting..."
                                  : "Reconnecting..."}
                            </Chip>
                          </>
                        )}
                      </>
                    )}
                    {sharedRoutine?.isCreator && (
                      <Chip
                        className="text-xs"
                        color={isSyncing ? "warning" : "success"}
                        size="sm"
                        variant="flat"
                      >
                        {isSyncing ? "Syncing..." : "Synced"}
                      </Chip>
                    )}
                    <Button
                      color="primary"
                      isDisabled={routineCourses.length === 0}
                      isLoading={isGeneratingLink}
                      size="sm"
                      variant="flat"
                      onPress={generateShareableLink}
                    >
                      {!isGeneratingLink && <Share2 size={16} />}
                      <span className="hidden sm:inline ml-1">
                        {sharedRoutine
                          ? sharedRoutine.isCreator
                            ? "Copy"
                            : "Fork"
                          : "Share"}
                      </span>
                    </Button>
                    <Button
                      color="secondary"
                      isDisabled={routineCourses.length === 0}
                      size="sm"
                      variant="flat"
                      onPress={onCalendarModalOpen}
                    >
                      <CalendarPlus size={16} />
                      <span className="hidden sm:inline ml-1">Calendar</span>
                    </Button>
                    <Button
                      color="danger"
                      isDisabled={routineCourses.length === 0}
                      size="sm"
                      variant="flat"
                      onPress={clearRoutine}
                    >
                      <Trash2 size={16} />
                      <span className="hidden sm:inline ml-1">Clear</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardBody className="pt-4">
                <div className="bg-content1 rounded-xl shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse routine-table">
                      <thead>
                        <tr className="bg-default-100 border-b border-default-200">
                          <th className="p-2 md:p-4 font-semibold text-center text-default-700 border-r border-default-200 whitespace-nowrap text-xs md:text-sm min-w-[60px] md:min-w-[80px]">
                            Time/Day
                          </th>
                          {days.map((day) => (
                            <th
                              key={day}
                              className="p-2 md:p-4 font-semibold text-center text-default-700 border-r border-default-200 last:border-r-0 whitespace-nowrap text-xs md:text-sm min-w-[80px] md:min-w-[110px]"
                            >
                              <span className="hidden md:inline">{day}</span>
                              <span className="md:hidden">
                                {day.substring(0, 3)}
                              </span>
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody>
                        {timeSlots.map((time, timeIndex) => (
                          <tr
                            key={time}
                            className={`border-b border-default-200 ${timeIndex % 2 === 0 ? "bg-content1" : "bg-content2"}`}
                          >
                            <td className="p-1 md:p-4 font-medium text-center bg-default-50 text-default-700 border-r border-default-200 whitespace-nowrap text-[10px] md:text-sm min-w-[60px] md:min-w-[80px]">
                              {convertTo12HourFormat(time)}
                            </td>

                            {days.map((day) => {
                              const routineCoursesInSlot =
                                getRoutineCoursesForSlot(day, time);
                              const isSpanningFromPrevious = isLabSpanningSlot(
                                day,
                                time,
                              );
                              const hasLabInThisSlot =
                                routineCoursesInSlot.some((course) =>
                                  course.labSchedules?.some((schedule) => {
                                    const scheduleDay =
                                      schedule.day.toUpperCase();
                                    const scheduleTime =
                                      schedule.startTime.substring(0, 5);
                                    const currentTimeIndex =
                                      timeSlots.indexOf(time);
                                    const labTimeIndex =
                                      timeSlots.indexOf(scheduleTime);

                                    return (
                                      scheduleDay === day.toUpperCase() &&
                                      (scheduleTime === time ||
                                        (labTimeIndex !== -1 &&
                                          currentTimeIndex ===
                                            labTimeIndex + 1))
                                    );
                                  }),
                                );

                              return (
                                <td
                                  key={`routine-${time}-${day}`}
                                  className={`p-1 md:p-3 border-r border-default-200 last:border-r-0 align-middle min-w-[80px] md:min-w-[110px] ${
                                    isSpanningFromPrevious || hasLabInThisSlot
                                      ? "bg-warning-100"
                                      : ""
                                  }`}
                                >
                                  <div className="space-y-1 md:space-y-2 flex flex-col items-center">
                                    {routineCoursesInSlot.map(
                                      (course, index) => {
                                        const info = formatCourseInfo(course);

                                        const classSchedules =
                                          course.sectionSchedule.classSchedules.filter(
                                            (s) =>
                                              s.day.toUpperCase() ===
                                                day.toUpperCase() &&
                                              s.startTime.substring(0, 5) ===
                                                time,
                                          );

                                        const labSchedules =
                                          course.labSchedules?.filter((s) => {
                                            const scheduleDay =
                                              s.day.toUpperCase();
                                            const scheduleTime =
                                              s.startTime.substring(0, 5);
                                            const currentTimeIndex =
                                              timeSlots.indexOf(time);
                                            const labTimeIndex =
                                              timeSlots.indexOf(scheduleTime);

                                            return (
                                              scheduleDay ===
                                                day.toUpperCase() &&
                                              (scheduleTime === time ||
                                                (labTimeIndex !== -1 &&
                                                  currentTimeIndex ===
                                                    labTimeIndex + 1))
                                            );
                                          }) || [];

                                        const isRemoving =
                                          removingCourseIds.has(
                                            course.sectionId,
                                          );

                                        return (
                                          <div
                                            key={`${course.sectionId}-${index}`}
                                            className={`space-y-1 flex flex-col items-center ${isRemoving ? "routine-chip-exit" : "routine-chip-enter"}`}
                                          >
                                            {classSchedules.map(
                                              (schedule, scheduleIndex) => {
                                                const isConflictedSchedule =
                                                  conflicts.has(
                                                    `${course.sectionId}-${schedule.day}-${schedule.startTime.substring(0, 5)}`,
                                                  );

                                                return (
                                                  <Chip
                                                    key={`routine-class-${scheduleIndex}`}
                                                    className="text-[9px] md:text-xs font-medium cursor-pointer hover:opacity-80 hover:scale-105 active:scale-95 transition-all duration-150 py-1 px-1.5 md:px-2 h-auto"
                                                    color={
                                                      isConflictedSchedule
                                                        ? "danger"
                                                        : "success"
                                                    }
                                                    endContent={
                                                      <Trash2
                                                        className="shrink-0"
                                                        size={10}
                                                      />
                                                    }
                                                    radius="sm"
                                                    size="sm"
                                                    variant="solid"
                                                    onClick={() =>
                                                      handleRoutineChipClick(
                                                        course,
                                                      )
                                                    }
                                                  >
                                                    <div className="flex flex-col items-center gap-0.5">
                                                      <div className="text-center font-semibold text-[9px] md:text-xs whitespace-nowrap">
                                                        {course.courseCode}
                                                      </div>
                                                      <div className="text-center text-[8px] md:text-[11px] opacity-80 whitespace-nowrap">
                                                        {info}
                                                      </div>
                                                    </div>
                                                  </Chip>
                                                );
                                              },
                                            )}

                                            {labSchedules.map(
                                              (schedule, scheduleIndex) => {
                                                const labStartTime =
                                                  schedule.startTime.substring(
                                                    0,
                                                    5,
                                                  );
                                                const labTimeIndex =
                                                  timeSlots.indexOf(
                                                    labStartTime,
                                                  );
                                                const labSlots =
                                                  labTimeIndex !== -1
                                                    ? [
                                                        timeSlots[labTimeIndex],
                                                        timeSlots[
                                                          labTimeIndex + 1
                                                        ],
                                                      ].filter(Boolean)
                                                    : [labStartTime];
                                                const isConflictedSchedule =
                                                  labSlots.some((slot) =>
                                                    conflicts.has(
                                                      `${course.sectionId}-lab-${schedule.day}-${slot}`,
                                                    ),
                                                  );

                                                return (
                                                  <Chip
                                                    key={`routine-lab-${scheduleIndex}`}
                                                    className="text-[9px] md:text-xs font-medium cursor-pointer hover:opacity-80 hover:scale-105 active:scale-95 transition-all duration-150 py-1 px-1.5 md:px-2 h-auto"
                                                    color={
                                                      isConflictedSchedule
                                                        ? "danger"
                                                        : "warning"
                                                    }
                                                    endContent={
                                                      <Trash2
                                                        className="shrink-0"
                                                        size={10}
                                                      />
                                                    }
                                                    radius="sm"
                                                    size="sm"
                                                    variant="solid"
                                                    onClick={() =>
                                                      handleRoutineChipClick(
                                                        course,
                                                      )
                                                    }
                                                  >
                                                    <div className="flex flex-col items-center gap-0.5">
                                                      <div className="text-center font-semibold text-[8px] md:text-[11px] whitespace-nowrap">
                                                        {course.courseCode}{" "}
                                                        (Lab)
                                                      </div>
                                                      <div className="text-center text-[7px] md:text-[10px] opacity-80 whitespace-nowrap">
                                                        {info}
                                                      </div>
                                                    </div>
                                                  </Chip>
                                                );
                                              },
                                            )}
                                          </div>
                                        );
                                      },
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        )}

        {selectedCourseData && (
          <Suspense fallback={<div>Loading...</div>}>
            <CourseScheduleModal
              course={selectedCourseData}
              isOpen={isModalOpen}
              onClose={handleModalClose}
            />
          </Suspense>
        )}

        <Modal isOpen={isShareModalOpen} size="md" onClose={onShareModalClose}>
          <ModalContent>
            <ModalHeader className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Share2 className="text-primary" size={20} />
                <span>Share Your Routine</span>
              </div>
            </ModalHeader>
            <ModalBody>
              <p className="text-default-500 text-sm mb-4">
                Share this link with friends so they can view your routine:
              </p>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  classNames={{
                    input: "text-sm",
                  }}
                  value={shareableUrl}
                  variant="bordered"
                />
                <Button
                  isIconOnly
                  color={isCopied ? "success" : "primary"}
                  variant="flat"
                  onPress={copyToClipboard}
                >
                  {isCopied ? <Check size={18} /> : <Copy size={18} />}
                </Button>
              </div>
              <p className="text-default-400 text-xs mt-2">
                {routineCourses.length} courses -{" "}
                {routineCourses.reduce((sum, c) => sum + c.courseCredit, 0)}{" "}
                credits
              </p>
            </ModalBody>
            <ModalFooter>
              <Button
                color="danger"
                variant="light"
                onPress={onShareModalClose}
              >
                Close
              </Button>
              <Button
                color="primary"
                startContent={
                  isCopied ? <Check size={16} /> : <Copy size={16} />
                }
                onPress={copyToClipboard}
              >
                {isCopied ? "Copied!" : "Copy Link"}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        <Suspense fallback={<div>Loading...</div>}>
          <CalendarExportModal
            courses={routineCourses}
            isOpen={isCalendarModalOpen}
            onClose={onCalendarModalClose}
          />
        </Suspense>
      </section>
    </DefaultLayout>
  );
}
