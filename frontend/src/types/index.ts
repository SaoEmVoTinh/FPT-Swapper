export type UserRole = "STUDENT" | "MODERATOR" | "ADMIN" | "SUPER_ADMIN";

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
  | "CANCELLED"
  | "EXPIRED";

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
  bio?: string;
  shareContactAfterMatch?: boolean;
  trustScore?: number;
  completedSwapsCount?: number;
  noShowCount?: number;
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
  lecturerCurrent?: string;
  scheduleConflictWarning?: string;
}

export interface DiscoverCard {
  requestId: string;
  studentId?: string;
  /** Your own ACTIVE request this candidate is compatible with (used when swiping). */
  myRequestId?: string;
  isCompatible?: boolean;
  hasCourseConflict?: boolean;
  semesterId?: string;
  courseId?: string;
  currentClassId?: string;
  targetClassId?: string;
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
  scheduleConflictWarning?: string;
  studentTrustScore?: number;
  studentCompletedSwaps?: number;
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
  confirmDeadlineAt?: string;
  partnerEmail?: string;
  partnerStudentCode?: string;
  partnerTrustScore?: number;
  partnerCompletedSwaps?: number;
  partnerNoShows?: number;
  myReviewSubmitted?: boolean;
  scheduleConflictWarning?: string;
}

export interface MessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  clientMessageId: string;
  content: string;
  attachmentUrl?: string;
  messageType?: "TEXT" | "IMAGE" | "SYSTEM";
  rawCreatedAt?: string;
  createdAt: string;
  pending?: boolean;
  failed?: boolean;
}

export interface ConversationItem {
  id: string;
  matchId: string;
  partnerId?: string;
  partnerName: string;
  courseCode: string;
  myClassCode: string;
  partnerClassCode: string;
  matchStatus: MatchStatus;
  lastMessage?: string;
  lastMessageAt?: string;
  partnerLastReadAt?: string;
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

export interface TimetableSlot {
  request_id?: string | null;
  course_code: string;
  course_name: string;
  class_code: string;
  semester_name: string;
  day_key: string;
  day_label: string;
  slot_key: string;
  slot_label: string;
  room?: string | null;
  lecturer?: string | null;
  status: string;
}

export interface ThreeWayParticipant {
  request_id: string;
  student_id: string;
  student_name: string;
  student_code_masked: string;
  current_class_code: string;
  target_class_code: string;
  accepted: boolean;
}

export interface ThreeWayCycle {
  proposal_id?: string | null;
  course_code?: string | null;
  course_name?: string | null;
  semester_name?: string | null;
  status: string;
  my_accepted: boolean;
  conversation_id?: string | null;
  req_a_id: string;
  req_b_id: string;
  req_c_id: string;
  participants: ThreeWayParticipant[];
}

export interface BlockedStudent {
  student_id: string;
  full_name?: string | null;
  student_code_masked: string;
  reason?: string | null;
  created_at: string;
}

export interface SmartRecommendation {
  request_id: string;
  for_request_id?: string | null;
  course_code: string;
  course_name: string;
  current_class_code: string;
  target_class_code: string;
  current_schedule_text: string;
  partner_name: string;
  trust_score: number;
  is_compatible: boolean;
  is_reciprocal_ready: boolean;
  schedule_conflict_warning?: string | null;
  score: number;
  reasons: string[];
}

export interface ClassHeatmapItem {
  class_id: string;
  course_code: string;
  course_name: string;
  class_code: string;
  semester_name: string;
  schedule_text: string;
  leaving_count: number;
  entering_count: number;
  net_demand: number;
  total_activity: number;
  heat_level: "HIGH" | "MEDIUM" | "LOW";
}

export interface SwapInsights {
  recommendations: SmartRecommendation[];
  heatmap: ClassHeatmapItem[];
}

