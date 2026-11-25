import {
  AcademicClass,
  Campus,
  ConversationItem,
  Course,
  DiscoverCard,
  MatchItem,
  MessageItem,
  NotificationItem,
  Semester,
  StudentProfile,
  SwapRequest,
} from "@/types";

import { FPT_COURSES } from "./fpt-courses";

export function normalizeCampusName(raw?: string | null): string {
  if (!raw) return "Hà Nội";
  const cleaned = raw
    .replace(/^FPTU\s+/i, "")
    .replace(/^FPT\s+/i, "")
    .replace(/\s*\(Hòa Lạc\)/gi, "")
    .replace(/\s*\(Hà Nội\)/gi, "")
    .trim();
  if (/^hòa lạc$/i.test(cleaned) || /^hoa lac$/i.test(cleaned)) {
    return "Hà Nội";
  }
  return cleaned || "Hà Nội";
}

export const DEMO_CAMPUSES: Campus[] = [
  { id: "campus-hl", code: "HN", name: "Hà Nội" },
  { id: "campus-dn", code: "DN", name: "Đà Nẵng" },
  { id: "campus-hcm", code: "HCM", name: "TP. Hồ Chí Minh" },
  { id: "campus-qn", code: "QN", name: "Quy Nhơn" },
  { id: "campus-ct", code: "CT", name: "Cần Thơ" },
];

export const DEMO_SEMESTERS: Semester[] = [
  { id: "sem-sp26", code: "SP26", name: "Spring 2026", isActive: true },
  { id: "sem-su26", code: "SU26", name: "Summer 2026", isActive: false },
];

export const DEMO_COURSES: Course[] = FPT_COURSES;

export const DEMO_CLASSES: AcademicClass[] = [
  {
    id: "cls-mkt-01",
    code: "MKT201_01",
    courseId: "crs-mkt201",
    semesterId: "sem-sp26",
    campusId: "campus-hl",
    lecturer: "ThS. Nguyễn Minh Anh",
    isSwappable: true,
    schedules: [
      { id: "s1", dayOfWeek: "Thứ 2 & Thứ 4", slot: "Slot 1 (07:30 - 09:50)", room: "BE-201" },
    ],
  },
  {
    id: "cls-mkt-02",
    code: "MKT201_02",
    courseId: "crs-mkt201",
    semesterId: "sem-sp26",
    campusId: "campus-hl",
    lecturer: "TS. Trần Hoàng Nam",
    isSwappable: true,
    schedules: [
      { id: "s2", dayOfWeek: "Thứ 2 & Thứ 4", slot: "Slot 3 (12:50 - 15:10)", room: "BE-304" },
    ],
  },
  {
    id: "cls-mkt-03",
    code: "MKT201_03",
    courseId: "crs-mkt201",
    semesterId: "sem-sp26",
    campusId: "campus-hl",
    lecturer: "ThS. Lê Thu Hà",
    isSwappable: true,
    schedules: [
      { id: "s3", dayOfWeek: "Thứ 3 & Thứ 5", slot: "Slot 2 (10:00 - 12:20)", room: "DE-112" },
    ],
  },
  {
    id: "cls-prj-01",
    code: "PRJ301_SE1801",
    courseId: "crs-prj301",
    semesterId: "sem-sp26",
    campusId: "campus-hl",
    lecturer: "ThS. Phạm Đức Huy",
    isSwappable: true,
    schedules: [
      { id: "s4", dayOfWeek: "Thứ 3 & Thứ 5", slot: "Slot 1 (07:30 - 09:50)", room: "AL-302" },
    ],
  },
  {
    id: "cls-prj-02",
    code: "PRJ301_SE1802",
    courseId: "crs-prj301",
    semesterId: "sem-sp26",
    campusId: "campus-hl",
    lecturer: "ThS. Vũ Tuấn Kiệt",
    isSwappable: true,
    schedules: [
      { id: "s5", dayOfWeek: "Thứ 2 & Thứ 4", slot: "Slot 4 (15:20 - 17:40)", room: "AL-205" },
    ],
  },
];

export const GUEST_STUDENT: StudentProfile = {
  id: "guest",
  fullName: "Khách (Chưa đăng nhập)",
  studentCode: "GUEST",
  email: "Chưa đăng nhập",
  campusId: "campus-hl",
  campusName: "Hà Nội",
  major: "Chưa cập nhật",
  role: "STUDENT",
};

export const DEMO_STUDENT: StudentProfile = GUEST_STUDENT;

export const DEMO_REQUESTS: SwapRequest[] = [
  {
    id: "req-1",
    studentId: "stu-me",
    semesterId: "sem-sp26",
    semesterName: "Spring 2026",
    courseId: "crs-mkt201",
    courseCode: "MKT201",
    courseName: "Consumer Behavior",
    currentClassId: "cls-mkt-01",
    currentClassCode: "MKT201_01",
    currentScheduleText: "Thứ 2 & Thứ 4 • Slot 1 (07:30 - 09:50)",
    targetClassId: "cls-mkt-02",
    targetClassCode: "MKT201_02",
    targetScheduleText: "Thứ 2 & Thứ 4 • Slot 3 (12:50 - 15:10)",
    alternativeClassCode: "MKT201_03",
    note: "Mình bị trùng lịch thực tập buổi sáng nên cần chuyển sang Slot 3 chiều.",
    expiresAt: "2026-12-15",
    status: "ACTIVE",
    createdAt: "2026-11-24T08:30:00Z",
  },
  {
    id: "req-2",
    studentId: "stu-me",
    semesterId: "sem-sp26",
    semesterName: "Spring 2026",
    courseId: "crs-prj301",
    courseCode: "PRJ301",
    courseName: "Java Web Application Development",
    currentClassId: "cls-prj-01",
    currentClassCode: "PRJ301_SE1801",
    currentScheduleText: "Thứ 3 & Thứ 5 • Slot 1 (07:30 - 09:50)",
    targetClassId: "cls-prj-02",
    targetClassCode: "PRJ301_SE1802",
    targetScheduleText: "Thứ 2 & Thứ 4 • Slot 4 (15:20 - 17:40)",
    note: "Muốn học cùng nhóm bạn ở SE1802.",
    expiresAt: "2026-12-10",
    status: "PAUSED",
    createdAt: "2026-11-22T14:10:00Z",
  },
];

export const DEMO_DISCOVER_CARDS: DiscoverCard[] = [
  {
    requestId: "req-cand-1",
    studentDisplayName: "Trần Bảo Ngọc",
    studentCodeMasked: "HE18****",
    campusName: "Hà Nội",
    major: "Digital Marketing",
    semesterName: "Spring 2026",
    courseCode: "MKT201",
    courseName: "Consumer Behavior",
    currentClassCode: "MKT201_02",
    currentScheduleText: "Thứ 2 & Thứ 4 • Slot 3 (12:50 - 15:10) • BE-304",
    targetClassCode: "MKT201_01",
    targetScheduleText: "Thứ 2 & Thứ 4 • Slot 1 (07:30 - 09:50) • BE-201",
    lecturerCurrent: "TS. Trần Hoàng Nam",
    note: "Mình muốn học buổi sáng cho đỡ nắng, chiều mình đi làm part-time.",
    isReciprocalReady: true,
  },
  {
    requestId: "req-cand-2",
    studentDisplayName: "Lê Hoàng Phúc",
    studentCodeMasked: "HE17****",
    campusName: "Đà Nẵng",
    major: "Software Engineering",
    semesterName: "Spring 2026",
    courseCode: "PRJ301",
    courseName: "Java Web Application Development",
    currentClassCode: "PRJ301_SE1802",
    currentScheduleText: "Thứ 2 & Thứ 4 • Slot 4 (15:20 - 17:40) • AL-205",
    targetClassCode: "PRJ301_SE1801",
    targetScheduleText: "Thứ 3 & Thứ 5 • Slot 1 (07:30 - 09:50) • AL-302",
    lecturerCurrent: "ThS. Vũ Tuấn Kiệt",
    note: "Đổi nhanh trong tuần này trước khi hết hạn đổi lớp.",
    isReciprocalReady: false,
  },
  {
    requestId: "req-cand-3",
    studentDisplayName: "Phạm Khánh Linh",
    studentCodeMasked: "HS18****",
    campusName: "TP. Hồ Chí Minh",
    major: "International Business",
    semesterName: "Spring 2026",
    courseCode: "MKT201",
    courseName: "Consumer Behavior",
    currentClassCode: "MKT201_02",
    currentScheduleText: "Thứ 2 & Thứ 4 • Slot 3 (12:50 - 15:10) • BE-304",
    targetClassCode: "MKT201_01",
    targetScheduleText: "Thứ 2 & Thứ 4 • Slot 1 (07:30 - 09:50) • BE-201",
    lecturerCurrent: "TS. Trần Hoàng Nam",
    note: "Có thể trao đổi ngay tối nay qua chat để sáng mai làm đơn.",
    isReciprocalReady: true,
  },
];

export const DEMO_MATCHES: MatchItem[] = [
  {
    id: "match-1",
    myRequestId: "req-1",
    partnerRequestId: "req-cand-99",
    partnerName: "Đỗ Minh Quân",
    partnerCampus: "Hà Nội",
    courseCode: "MKT201",
    courseName: "Consumer Behavior",
    semesterName: "Spring 2026",
    myClassCode: "MKT201_01",
    partnerClassCode: "MKT201_02",
    status: "PENDING_CONFIRMATION",
    myConfirmed: false,
    partnerConfirmed: true,
    conversationId: "conv-1",
    createdAt: "2026-11-24T10:15:00Z",
  },
];

export const DEMO_CONVERSATIONS: ConversationItem[] = [
  {
    id: "conv-1",
    matchId: "match-1",
    partnerName: "Đỗ Minh Quân",
    courseCode: "MKT201",
    myClassCode: "MKT201_01",
    partnerClassCode: "MKT201_02",
    matchStatus: "PENDING_CONFIRMATION",
    lastMessage: "Chào bạn, mình cũng đang cần đổi sang MKT201_01 trong tuần này!",
    lastMessageAt: "10:20",
    unreadCount: 1,
  },
];

export const DEMO_MESSAGES: MessageItem[] = [
  {
    id: "msg-1",
    conversationId: "conv-1",
    senderId: "partner-1",
    clientMessageId: "cm-1",
    content: "Chào bạn, mình cũng đang cần đổi sang MKT201_01 trong tuần này!",
    createdAt: "10:20",
  },
  {
    id: "msg-2",
    conversationId: "conv-1",
    senderId: "guest",
    clientMessageId: "cm-2",
    content: "Tuyệt quá! Mình đã tạo request sẵn rồi, bạn check lịch giúp mình nhé.",
    createdAt: "10:22",
  },
];

export const DEMO_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "notif-1",
    title: "Match mới cho môn MKT201!",
    body: "Bạn và Đỗ Minh Quân đã cùng Like yêu cầu đổi lớp MKT201_01 ⇄ MKT201_02.",
    type: "MATCH",
    isRead: false,
    createdAt: "2 giờ trước",
    href: "/matches",
  },
  {
    id: "notif-2",
    title: "Tin nhắn mới từ Đỗ Minh Quân",
    body: "Chào bạn, mình cũng đang cần đổi sang MKT201_01 trong tuần này!",
    type: "MESSAGE",
    isRead: false,
    createdAt: "2 giờ trước",
    href: "/chat",
  },
  {
    id: "notif-3",
    title: "Nhắc nhở quy định đổi lớp",
    body: "FPT ClassSwap chỉ hỗ trợ kết nối. Sau khi Confirm, hai bạn hãy thực hiện thủ tục chính thức theo quy định của trường.",
    type: "SYSTEM",
    isRead: true,
    createdAt: "1 ngày trước",
  },
];
