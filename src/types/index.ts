import { SVGProps } from "react";

export type IconSvgProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

export interface CourseSchedule {
  startTime: string;
  endTime: string;
  day: string;
}

export interface CourseData {
  sectionId: number;
  courseId: number;
  sectionName: string;
  courseCredit: number;
  courseCode: string;
  sectionType: string;
  capacity: number;
  consumedSeat: number;
  semesterSessionId: number;
  parentSectionId: number | null;
  faculties: string;
  roomName: string;
  roomNumber: string;
  academicDegree: string;
  sectionSchedule: {
    classPairId: number | null;
    classSlotId: number | null;
    finalExamDate: string;
    finalExamStartTime: string;
    finalExamEndTime: string;
    midExamDate: string;
    midExamStartTime: string;
    midExamEndTime: string;
    finalExamDetail: string;
    midExamDetail: string;
    classStartDate: string;
    classEndDate: string;
    classSchedules: CourseSchedule[];
  };
  labSchedules?: CourseSchedule[];
  labSectionId?: number;
  labCourseCode?: string;
  labFaculties?: string | null;
  labName?: string;
  labRoomName?: string;
  prerequisiteCourses?: string;
  preRegLabSchedule?: string;
  preRegSchedule?: string;
  courseName?: string;
}

export interface CourseListItem {
  courseCode: string;
  courseName: string;
  courseCredit: number;
  academicDegree: string;
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

export interface SharedRoutine {
  routineId: string;
  sectionIds: number[];
  sections: CourseData[];
  createdAt: string;
  updatedAt: string;
  accessCount: number;
}

export interface CreateRoutineResponse {
  success: boolean;
  shortCode: string;
  routineId: string;
  sectionCount: number;
  shareUrl: string;
}
