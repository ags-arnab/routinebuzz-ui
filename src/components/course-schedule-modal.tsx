import type { CourseData, CourseSchedule } from "@/types";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Chip } from "@heroui/chip";

const convertTo12HourFormat = (time24: string): string => {
  const [hours, minutes] = time24.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
};

interface CourseScheduleModalProps {
  course: CourseData;
  isOpen: boolean;
  onClose: () => void;
}

const daysOrder = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

export default function CourseScheduleModal({
  course,
  isOpen,
  onClose,
}: CourseScheduleModalProps) {
  const availableSeats = course.capacity - course.consumedSeat;

  const getCourseName = () => {
    if (course.labName) {
      return course.labName.replace(/\s+LAB$/i, "").trim();
    }
    return course.courseCode;
  };

  const formatScheduleInfo = (schedule: CourseSchedule) => ({
    day: schedule.day,
    time: `${convertTo12HourFormat(schedule.startTime.substring(0, 5))} - ${convertTo12HourFormat(schedule.endTime.substring(0, 5))}`,
    room: course.roomName || "TBA",
  });

  const formatLabScheduleInfo = (schedule: CourseSchedule) => ({
    day: schedule.day,
    time: `${convertTo12HourFormat(schedule.startTime.substring(0, 5))} - ${convertTo12HourFormat(schedule.endTime.substring(0, 5))}`,
    room: course.labRoomName || "TBA",
  });

  const groupedSchedules = course.sectionSchedule.classSchedules.reduce(
    (acc, schedule) => {
      const day = schedule.day;
      if (!acc[day]) acc[day] = [];
      acc[day].push(formatScheduleInfo(schedule));
      return acc;
    },
    {} as Record<string, any[]>,
  );

  const groupedLabSchedules =
    course.labSchedules?.reduce(
      (acc, schedule) => {
        const day = schedule.day;
        if (!acc[day]) acc[day] = [];
        acc[day].push(formatLabScheduleInfo(schedule));
        return acc;
      },
      {} as Record<string, any[]>,
    ) || {};

  const allDays = Array.from(
    new Set([
      ...Object.keys(groupedSchedules),
      ...Object.keys(groupedLabSchedules),
    ]),
  );

  const sortedDays = allDays.sort(
    (a, b) => daysOrder.indexOf(a) - daysOrder.indexOf(b),
  );

  return (
    <Modal
      backdrop="blur"
      className="max-h-[90vh]"
      isOpen={isOpen}
      scrollBehavior="inside"
      size="5xl"
      onClose={onClose}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <h2 className="text-lg sm:text-xl font-bold">
              {course.courseCode} - {getCourseName()}
            </h2>
            <Chip color="primary" size="sm" variant="flat">
              Section {course.sectionName}
            </Chip>
          </div>
          <div className="text-sm text-default-500">
            {course.faculties || "TBA"} • {course.courseCredit} Credits •{" "}
            {availableSeats} seats available
          </div>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Course Information</h3>
              </CardHeader>
              <CardBody className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <span className="font-medium">Course Code:</span>{" "}
                    {course.courseCode}
                  </div>
                  <div>
                    <span className="font-medium">Course Name:</span>{" "}
                    {getCourseName()}
                  </div>
                  <div>
                    <span className="font-medium">Section:</span>{" "}
                    {course.sectionName}
                  </div>
                  <div>
                    <span className="font-medium">Faculty:</span>{" "}
                    {course.faculties || "TBA"}
                  </div>
                  <div>
                    <span className="font-medium">Credits:</span>{" "}
                    {course.courseCredit}
                  </div>
                  <div>
                    <span className="font-medium">Capacity:</span>{" "}
                    {course.capacity}
                  </div>
                  <div>
                    <span className="font-medium">Available Seats:</span>{" "}
                    {availableSeats}
                  </div>
                  {course.prerequisiteCourses && (
                    <div className="col-span-1 md:col-span-2">
                      <span className="font-medium">Prerequisites:</span>{" "}
                      {course.prerequisiteCourses}
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Class Schedule</h3>
              </CardHeader>
              <CardBody>
                <div className="space-y-3">
                  {sortedDays.map((day) => {
                    const classSchedules = groupedSchedules[day] || [];
                    if (classSchedules.length === 0) return null;

                    return (
                      <div
                        key={day}
                        className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 bg-default-50 rounded-lg"
                      >
                        <div className="font-medium w-12 sm:w-20 text-sm sm:text-base">
                          {day.slice(0, 3)}
                        </div>
                        <div className="flex flex-col gap-2 flex-1 sm:ml-0">
                          {classSchedules.map((schedule, index) => (
                            <div
                              key={index}
                              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2"
                            >
                              <div className="flex items-center gap-2">
                                <Chip color="success" size="sm" variant="flat">
                                  Class
                                </Chip>
                                <span className="text-sm sm:text-base">
                                  {schedule.time}
                                </span>
                              </div>
                              <div className="text-sm text-default-600 sm:ml-2">
                                Room: {schedule.room}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardBody>
            </Card>

            {course.labSchedules && course.labSchedules.length > 0 && (
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">Lab Schedule</h3>
                </CardHeader>
                <CardBody>
                  <div className="space-y-3">
                    {sortedDays.map((day) => {
                      const labSchedules = groupedLabSchedules[day] || [];
                      if (labSchedules.length === 0) return null;

                      return (
                        <div
                          key={`lab-${day}`}
                          className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 bg-warning-50 rounded-lg"
                        >
                          <div className="font-medium w-12 sm:w-20 text-sm sm:text-base">
                            {day.slice(0, 3)}
                          </div>
                          <div className="flex flex-col gap-2 flex-1 sm:ml-0">
                            {labSchedules.map((schedule, index) => (
                              <div
                                key={index}
                                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2"
                              >
                                <div className="flex items-center gap-2">
                                  <Chip color="warning" size="sm" variant="flat">
                                    Lab
                                  </Chip>
                                  <span className="text-sm sm:text-base">
                                    {schedule.time}
                                  </span>
                                </div>
                                <div className="text-sm text-default-600 sm:ml-2">
                                  Room: {schedule.room}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardBody>
              </Card>
            )}

            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Exam Schedule</h3>
              </CardHeader>
              <CardBody className="space-y-3">
                <div>
                  <h4 className="font-medium text-green-600">Midterm Exam</h4>
                  <p className="text-sm">
                    {course.sectionSchedule.midExamDetail}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-red-600">Final Exam</h4>
                  <p className="text-sm">
                    {course.sectionSchedule.finalExamDetail}
                  </p>
                </div>
              </CardBody>
            </Card>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="danger" variant="light" onPress={onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
