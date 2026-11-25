export type UserRole = "STUDENT" | "MODERATOR" | "ADMIN";

export type SwapRequestStatus =
  | "DRAFT"
  | "ACTIVE"
  | "PAUSED"
  | "MATCHED"
  | "COMPLETED"
  | "CANCELLED"
  | "EXPIRED";

export type MatchStatus =
  | "PENDING_CONFIRMATION"
  | "CONFIRMED"
  | "DECLINED"
  | "COMPLETED"
  | "CANCELLED";

export type SwipeAction = "LIKE" | "PASS";

export interface Campus {
  id: string;
  code: string;
  name: string;
}

export interface Semester {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  credits: number;
}

export interface ClassSchedule {
  id: string;
  dayOfWeek: string;
  slot: string;
  room: string;
}

export interface AcademicClass {
  id: string;
  code: string;
  courseId: string;
  semesterId: string;
  campusId: string;
  lecturer: string;
  isSwappable: boolean;
  schedules: ClassSchedule[];
}

export interface StudentProfile {
  id: string;
  fullName: string;
  studentCode: string;
  email: string;
  campusId: string;
  campusName: string;
  major: string;
  role: UserRole;
  avatarUrl?: string;
}

export interface SwapRequest {
  id: string;
  studentId: string;
  semesterId: string;
  semesterName: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  currentClassId: string;
  currentClassCode: string;
  currentScheduleText: string;
  targetClassId: string;
  targetClassCode: string;
  targetScheduleText: string;
  alternativeClassCode?: string;
  note?: string;
  expiresAt: string;
  status: SwapRequestStatus;
  createdAt: string;
}

export interface DiscoverCard {
  requestId: string;
  studentDisplayName: string;
  studentCodeMasked: string;
  campusName: string;
  major: string;
  semesterName: string;
  courseCode: string;
  courseName: string;
  currentClassCode: string;
  currentScheduleText: string;
  targetClassCode: string;
  targetScheduleText: string;
  lecturerCurrent: string;
  note?: string;
  isReciprocalReady: boolean;
}

export interface MatchItem {
  id: string;
  myRequestId: string;
  partnerRequestId: string;
  partnerName: string;
  partnerCampus: string;
  courseCode: string;
  courseName: string;
  semesterName: string;
  myClassCode: string;
  partnerClassCode: string;
  status: MatchStatus;
  myConfirmed: boolean;
  partnerConfirmed: boolean;
  conversationId: string;
  createdAt: string;
}

export interface MessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  clientMessageId: string;
  content: string;
  createdAt: string;
}

export interface ConversationItem {
  id: string;
  matchId: string;
  partnerName: string;
  courseCode: string;
  myClassCode: string;
  partnerClassCode: string;
  matchStatus: MatchStatus;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type: "MATCH" | "MESSAGE" | "SYSTEM";
  isRead: boolean;
  createdAt: string;
  href?: string;
}

