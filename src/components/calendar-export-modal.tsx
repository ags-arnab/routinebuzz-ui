import { useState, useMemo, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Checkbox } from "@heroui/checkbox";
import { DatePicker } from "@heroui/date-picker";
import { Chip } from "@heroui/chip";
import { Switch } from "@heroui/switch";
import { RadioGroup, Radio } from "@heroui/radio";
import { parseDate, CalendarDate } from "@internationalized/date";
import {
  Calendar,
  Download,
  Clock,
  BookOpen,
  FlaskConical,
  GraduationCap,
  MapPin,
  User,
  GripVertical,
  Bell,
  X,
} from "lucide-react";

import type { CourseData } from "@/types";
import {
  downloadICalendar,
  type CalendarExportOptions,
} from "@/utils/calendar-export";

interface CalendarExportModalProps {
  courses: CourseData[];
  isOpen: boolean;
  onClose: () => void;
}

type TitleField = "code" | "name" | "section" | "type";

interface TitleToken {
  id: TitleField;
  label: string;
  example: string;
}

const availableTitleTokens: TitleToken[] = [
  { id: "code", label: "Code", example: "CSE321" },
  { id: "name", label: "Name", example: "Operating Systems" },
  { id: "section", label: "Section", example: "Sec 16" },
  { id: "type", label: "Type", example: "Lab" },
];

const reminderOptions = [
  { value: "0", label: "None" },
  { value: "5", label: "5 min" },
  { value: "10", label: "10 min" },
  { value: "15", label: "15 min" },
  { value: "30", label: "30 min" },
  { value: "60", label: "1 hour" },
];

function SortableToken({
  token,
  onRemove,
}: {
  token: TitleToken;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: token.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground rounded-md text-xs font-medium select-none ${
        isDragging ? "shadow-lg scale-105" : ""
      }`}
    >
      <button
        className="cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={12} />
      </button>
      <span>{token.label}</span>
      <button
        className="hover:bg-primary-600 rounded"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
      >
        <X size={10} />
      </button>
    </div>
  );
}

export default function CalendarExportModal({
  courses,
  isOpen,
  onClose,
}: CalendarExportModalProps) {
  const [includeLabs, setIncludeLabs] = useState(true);
  const [includeExams, setIncludeExams] = useState(true);
  const [enabledTitleFields, setEnabledTitleFields] = useState<TitleField[]>([
    "code",
    "name",
    "section",
  ]);
  const [titleSeparator, setTitleSeparator] = useState(" - ");
  const [includeFaculty, setIncludeFaculty] = useState(true);
  const [includeRoom, setIncludeRoom] = useState(true);
  const [includePrerequisites, setIncludePrerequisites] = useState(false);
  const [reminderMinutes, setReminderMinutes] = useState("15");
  const [useCustomDates, setUseCustomDates] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<CalendarDate | null>(null);
  const [customEndDate, setCustomEndDate] = useState<CalendarDate | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { stats, dateRange, sampleCourse } = useMemo(() => {
    let classCount = 0;
    let labCount = 0;
    let examCount = 0;
    let minStart = "";
    let maxEnd = "";

    for (const course of courses) {
      classCount += course.sectionSchedule.classSchedules?.length || 0;
      if (course.labSchedules) {
        labCount += course.labSchedules.length;
      }
      if (course.sectionSchedule.midExamDate) examCount++;
      if (course.sectionSchedule.finalExamDate) examCount++;

      const start = course.sectionSchedule.classStartDate;
      const end = course.sectionSchedule.classEndDate;

      if (!minStart || start < minStart) minStart = start;
      if (!maxEnd || end > maxEnd) maxEnd = end;
    }

    const formatDate = (dateStr: string) => {
      if (!dateStr) return "";
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    };

    return {
      stats: { classCount, labCount, examCount },
      dateRange: {
        start: minStart,
        end: maxEnd,
        startFormatted: formatDate(minStart),
        endFormatted: formatDate(maxEnd),
      },
      sampleCourse: courses[0] || null,
    };
  }, [courses]);

  const generatePreviewTitle = useCallback(
    (course: CourseData | null, isLab: boolean = false) => {
      if (!course) return "No courses selected";

      const courseName = course.labName
        ? course.labName.replace(/\s+LAB$/i, "").trim()
        : course.courseCode;

      const parts: string[] = [];

      for (const field of enabledTitleFields) {
        switch (field) {
          case "code":
            parts.push(isLab ? `${course.courseCode}L` : course.courseCode);
            break;
          case "name":
            parts.push(isLab ? `${courseName} Lab` : courseName);
            break;
          case "section":
            parts.push(`Sec ${course.sectionName}`);
            break;
          case "type":
            parts.push(isLab ? "Lab" : "Class");
            break;
        }
      }

      return parts.join(titleSeparator);
    },
    [enabledTitleFields, titleSeparator]
  );

  const enabledTokens = useMemo(() => {
    return enabledTitleFields
      .map((id) => availableTitleTokens.find((t) => t.id === id)!)
      .filter(Boolean);
  }, [enabledTitleFields]);

  const disabledTokens = useMemo(() => {
    return availableTitleTokens.filter((t) => !enabledTitleFields.includes(t.id));
  }, [enabledTitleFields]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setEnabledTitleFields((items) => {
        const oldIndex = items.indexOf(active.id as TitleField);
        const newIndex = items.indexOf(over.id as TitleField);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const addField = (field: TitleField) => {
    if (!enabledTitleFields.includes(field)) {
      setEnabledTitleFields((prev) => [...prev, field]);
    }
  };

  const removeField = (field: TitleField) => {
    if (enabledTitleFields.length > 1) {
      setEnabledTitleFields((prev) => prev.filter((f) => f !== field));
    }
  };

  const formatCalendarDate = (date: CalendarDate | null): string | undefined => {
    if (!date) return undefined;
    return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
  };

  const buildExportOptions = (): CalendarExportOptions => {
    let titleFormat: "code" | "name" | "both" = "both";
    const hasCode = enabledTitleFields.includes("code");
    const hasName = enabledTitleFields.includes("name");
    if (hasCode && !hasName) titleFormat = "code";
    else if (hasName && !hasCode) titleFormat = "name";

    return {
      includeLabs,
      includeExams,
      reminderMinutes: reminderMinutes === "0" ? null : parseInt(reminderMinutes),
      titleFormat,
      includeSection: enabledTitleFields.includes("section"),
      includeFaculty,
      customStartDate: useCustomDates ? formatCalendarDate(customStartDate) : undefined,
      customEndDate: useCustomDates ? formatCalendarDate(customEndDate) : undefined,
    };
  };

  const handleExport = () => {
    setIsExporting(true);
    try {
      const options = buildExportOptions();
      const filename = `routine-${new Date().toISOString().split("T")[0]}`;
      downloadICalendar(courses, options, filename);
      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 500);
    } catch (error) {
      console.error("Export failed:", error);
      setIsExporting(false);
    }
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return "";
    const [hours, minutes] = timeStr.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  return (
    <Modal
      backdrop="blur"
      className="max-h-[90vh]"
      isOpen={isOpen}
      scrollBehavior="inside"
      size="3xl"
      onClose={onClose}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <Calendar size={20} />
              Export to Calendar
            </h2>
            <Chip color="primary" size="sm" variant="flat">
              {courses.length} courses
            </Chip>
          </div>
          <div className="text-sm text-default-500">
            {dateRange.startFormatted} — {dateRange.endFormatted} • Download as .ics file
          </div>
        </ModalHeader>

        <ModalBody>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">What to Include</h3>
              </CardHeader>
              <CardBody className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex items-center justify-between p-3 bg-success-50 rounded-lg border-2 border-success">
                    <div className="flex items-center gap-2">
                      <BookOpen className="text-success" size={18} />
                      <div>
                        <p className="font-medium text-sm">Classes</p>
                        <p className="text-xs text-default-500">{stats.classCount}/week</p>
                      </div>
                    </div>
                    <Chip size="sm" color="success" variant="flat">Required</Chip>
                  </div>

                  <div
                    className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      includeLabs && stats.labCount > 0
                        ? "bg-warning-50 border-warning"
                        : "bg-default-50 border-default-200"
                    } ${stats.labCount === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                    onClick={() => stats.labCount > 0 && setIncludeLabs(!includeLabs)}
                  >
                    <div className="flex items-center gap-2">
                      <FlaskConical className={includeLabs ? "text-warning" : "text-default-400"} size={18} />
                      <div>
                        <p className="font-medium text-sm">Labs</p>
                        <p className="text-xs text-default-500">{stats.labCount}/week</p>
                      </div>
                    </div>
                    <Checkbox
                      isSelected={includeLabs}
                      isDisabled={stats.labCount === 0}
                      onValueChange={setIncludeLabs}
                      size="sm"
                    />
                  </div>

                  <div
                    className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      includeExams && stats.examCount > 0
                        ? "bg-danger-50 border-danger"
                        : "bg-default-50 border-default-200"
                    } ${stats.examCount === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                    onClick={() => stats.examCount > 0 && setIncludeExams(!includeExams)}
                  >
                    <div className="flex items-center gap-2">
                      <GraduationCap className={includeExams ? "text-danger" : "text-default-400"} size={18} />
                      <div>
                        <p className="font-medium text-sm">Exams</p>
                        <p className="text-xs text-default-500">{stats.examCount} total</p>
                      </div>
                    </div>
                    <Checkbox
                      isSelected={includeExams}
                      isDisabled={stats.examCount === 0}
                      onValueChange={setIncludeExams}
                      size="sm"
                    />
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Event Title Format</h3>
              </CardHeader>
              <CardBody className="space-y-4">
                <div>
                  <p className="text-xs text-default-500 mb-2">Drag to reorder, click × to remove</p>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={enabledTitleFields}
                      strategy={horizontalListSortingStrategy}
                    >
                      <div className="flex flex-wrap gap-2 min-h-[32px] p-2 bg-default-100 rounded-lg border border-dashed border-default-300">
                        {enabledTokens.map((token) => (
                          <SortableToken
                            key={token.id}
                            token={token}
                            onRemove={() => removeField(token.id)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>

                {disabledTokens.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {disabledTokens.map((token) => (
                      <Chip
                        key={token.id}
                        className="cursor-pointer"
                        variant="flat"
                        size="sm"
                        onClick={() => addField(token.id)}
                      >
                        + {token.label}
                      </Chip>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm">Separator:</span>
                  {[" - ", " | ", " • ", ": "].map((sep) => (
                    <Button
                      key={sep}
                      size="sm"
                      variant={titleSeparator === sep ? "solid" : "flat"}
                      color={titleSeparator === sep ? "primary" : "default"}
                      onPress={() => setTitleSeparator(sep)}
                    >
                      {sep.trim()}
                    </Button>
                  ))}
                </div>

                <div className="p-3 bg-default-50 rounded-lg">
                  <p className="text-xs text-default-500 mb-1">Preview:</p>
                  <p className="font-medium">{generatePreviewTitle(sampleCourse, false)}</p>
                  {includeLabs && stats.labCount > 0 && (
                    <p className="font-medium text-warning-600">{generatePreviewTitle(sampleCourse, true)}</p>
                  )}
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <h3 className="text-lg font-semibold">Date Range</h3>
                <Switch size="sm" isSelected={useCustomDates} onValueChange={setUseCustomDates}>
                  Custom
                </Switch>
              </CardHeader>
              <CardBody>
                {!useCustomDates ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-default-500">Start Date</p>
                      <p className="font-medium">{dateRange.startFormatted || "Not available"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-default-500">End Date</p>
                      <p className="font-medium">{dateRange.endFormatted || "Not available"}</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <DatePicker
                      label="Start Date"
                      size="sm"
                      variant="bordered"
                      value={customStartDate || (dateRange.start ? parseDate(dateRange.start) : null)}
                      onChange={setCustomStartDate}
                      showMonthAndYearPickers
                      granularity="day"
                    />
                    <DatePicker
                      label="End Date"
                      size="sm"
                      variant="bordered"
                      value={customEndDate || (dateRange.end ? parseDate(dateRange.end) : null)}
                      onChange={setCustomEndDate}
                      showMonthAndYearPickers
                      granularity="day"
                    />
                  </div>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Bell size={18} />
                  Reminders
                </h3>
              </CardHeader>
              <CardBody>
                <RadioGroup
                  orientation="horizontal"
                  value={reminderMinutes}
                  onValueChange={setReminderMinutes}
                  classNames={{ wrapper: "gap-2 flex-wrap" }}
                >
                  {reminderOptions.map((option) => (
                    <Radio
                      key={option.value}
                      value={option.value}
                      classNames={{
                        base: "m-0 px-3 py-2 border-2 border-default-200 rounded-lg data-[selected=true]:border-primary",
                        label: "text-sm",
                      }}
                    >
                      {option.label}
                    </Radio>
                  ))}
                </RadioGroup>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Event Description</h3>
              </CardHeader>
              <CardBody className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-default-500" />
                    <span className="text-sm">Include Faculty Name</span>
                  </div>
                  <Switch size="sm" isSelected={includeFaculty} onValueChange={setIncludeFaculty} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-default-500" />
                    <span className="text-sm">Include Room/Location</span>
                  </div>
                  <Switch size="sm" isSelected={includeRoom} onValueChange={setIncludeRoom} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen size={16} className="text-default-500" />
                    <span className="text-sm">Include Prerequisites</span>
                  </div>
                  <Switch size="sm" isSelected={includePrerequisites} onValueChange={setIncludePrerequisites} />
                </div>
              </CardBody>
            </Card>

            {sampleCourse && (
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">Event Preview</h3>
                </CardHeader>
                <CardBody className="space-y-3">
                  <div className="p-3 bg-success-50 rounded-lg border-l-4 border-success">
                    <div className="flex items-center gap-2 mb-1">
                      <Chip size="sm" color="success" variant="flat">Class</Chip>
                      <span className="text-xs text-default-400">
                        Weekly • {sampleCourse.sectionSchedule.classSchedules?.[0]?.day}
                      </span>
                    </div>
                    <p className="font-semibold">{generatePreviewTitle(sampleCourse, false)}</p>
                    <div className="mt-1 text-sm text-default-600 space-y-0.5">
                      <p className="flex items-center gap-1">
                        <Clock size={12} />
                        {formatTime(sampleCourse.sectionSchedule.classSchedules?.[0]?.startTime || "")} - {formatTime(sampleCourse.sectionSchedule.classSchedules?.[0]?.endTime || "")}
                      </p>
                      {includeRoom && (
                        <p className="flex items-center gap-1">
                          <MapPin size={12} />
                          {sampleCourse.roomName || "TBA"}
                        </p>
                      )}
                      {includeFaculty && (
                        <p className="flex items-center gap-1">
                          <User size={12} />
                          {sampleCourse.faculties || "TBA"}
                        </p>
                      )}
                    </div>
                  </div>

                  {includeLabs && sampleCourse.labSchedules && sampleCourse.labSchedules.length > 0 && (
                    <div className="p-3 bg-warning-50 rounded-lg border-l-4 border-warning">
                      <div className="flex items-center gap-2 mb-1">
                        <Chip size="sm" color="warning" variant="flat">Lab</Chip>
                        <span className="text-xs text-default-400">
                          Weekly • {sampleCourse.labSchedules[0]?.day}
                        </span>
                      </div>
                      <p className="font-semibold">{generatePreviewTitle(sampleCourse, true)}</p>
                      <div className="mt-1 text-sm text-default-600 space-y-0.5">
                        <p className="flex items-center gap-1">
                          <Clock size={12} />
                          {formatTime(sampleCourse.labSchedules[0]?.startTime || "")} - {formatTime(sampleCourse.labSchedules[0]?.endTime || "")}
                        </p>
                        {includeRoom && (
                          <p className="flex items-center gap-1">
                            <MapPin size={12} />
                            {sampleCourse.labRoomName || "TBA"}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </CardBody>
              </Card>
            )}
          </div>
        </ModalBody>

        <ModalFooter>
          <Button color="danger" variant="light" onPress={onClose}>
            Cancel
          </Button>
          <Button
            color="primary"
            isDisabled={courses.length === 0}
            isLoading={isExporting}
            startContent={!isExporting && <Download size={16} />}
            onPress={handleExport}
          >
            Download .ics
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
