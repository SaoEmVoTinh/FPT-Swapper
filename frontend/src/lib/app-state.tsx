"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { ApiError, apiFetch } from "@/lib/api";
import {
  initSoundUnlock,
  isSoundEnabled,
  playNotificationBell,
  setSoundEnabledPref,
} from "@/lib/sound";
import { RealtimeEvent, RealtimeStatus, useRealtimeSocket } from "@/lib/use-realtime-socket";
import {
  DEMO_CAMPUSES,
  DEMO_CONVERSATIONS,
  DEMO_COURSES,
  DEMO_DISCOVER_CARDS,
  DEMO_MATCHES,
  DEMO_MESSAGES,
  DEMO_NOTIFICATIONS,
  DEMO_REQUESTS,
  DEMO_SEMESTERS,
  GUEST_STUDENT,
  normalizeCampusName,
} from "@/lib/demo-data";
import {
  Campus,
  ConversationItem,
  Course,
  DiscoverCard,
  MatchItem,
  MatchStatus,
  MessageItem,
  NotificationItem,
  Semester,
  StudentProfile,
  SwapRequest,
  SwapRequestStatus,
  SwipeAction,
} from "@/types";

export interface AuthMeResponse {
  id: string;
  email: string;
  student_code: string;
  role: StudentProfile["role"];
  full_name?: string | null;
  major?: string | null;
  campus_id?: string | null;
  campus_code?: string | null;
  campus_name?: string | null;
  avatar_url?: string | null;
}

// ───────────────────────── API payloads ─────────────────────────

interface ApiRequest {
  id: string;
  student_id: string;
  semester_id: string;
  course_id: string;
  current_class_id: string;
  target_class_id: string;
  note?: string | null;
  expires_at?: string | null;
  status: SwapRequestStatus;
  created_at: string;
  course_code?: string | null;
  course_name?: string | null;
  semester_name?: string | null;
  current_class_code?: string | null;
  current_schedule_text?: string | null;
  target_class_code?: string | null;
  target_schedule_text?: string | null;
}

interface ApiDiscover {
  id: string;
  for_request_id?: string | null;
  note?: string | null;
  student_display_name?: string | null;
  student_code_masked?: string | null;
  major?: string | null;
  campus_name?: string | null;
  semester_name?: string | null;
  course_code?: string | null;
  course_name?: string | null;
  current_class_code?: string | null;
  current_schedule_text?: string | null;
  target_class_code?: string | null;
  target_schedule_text?: string | null;
  lecturer_current?: string | null;
  is_reciprocal_ready: boolean;
}

interface ApiMatch {
  id: string;
  status: MatchStatus;
  created_at: string;
  my_request_id?: string | null;
  partner_request_id?: string | null;
  partner_name?: string | null;
  partner_campus?: string | null;
  course_code?: string | null;
  course_name?: string | null;
  semester_name?: string | null;
  my_class_code?: string | null;
  partner_class_code?: string | null;
  my_confirmed: boolean;
  partner_confirmed: boolean;
  conversation_id?: string | null;
}

interface ApiSwipe {
  match_id?: string | null;
  match_created: boolean;
  match?: ApiMatch | null;
}

interface ApiConversation {
  id: string;
  match_id?: string | null;
  partner_name?: string | null;
  course_code?: string | null;
  my_class_code?: string | null;
  partner_class_code?: string | null;
  match_status?: MatchStatus | null;
  last_message?: string | null;
  last_message_at?: string | null;
  last_message_sender_id?: string | null;
}

interface ApiNotification {
  id: string;
  notification_type: NotificationItem["type"];
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

// ───────────────────────── Mapping helpers ─────────────────────────

function formatTime(isoOrTime: string): string {
  const d = new Date(isoOrTime);
  if (Number.isNaN(d.getTime())) return isoOrTime;
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const minutes = Math.floor((Date.now() - d.getTime()) / 60000);
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

function mapRequest(r: ApiRequest): SwapRequest {
  return {
    id: r.id,
    studentId: r.student_id,
    semesterId: r.semester_id,
    semesterName: r.semester_name || "—",
    courseId: r.course_id,
    courseCode: r.course_code || "—",
    courseName: r.course_name || "",
    currentClassId: r.current_class_id,
    currentClassCode: r.current_class_code || r.current_class_id.slice(0, 8).toUpperCase(),
    currentScheduleText: r.current_schedule_text || "Chưa cập nhật lịch",
    targetClassId: r.target_class_id,
    targetClassCode: r.target_class_code || r.target_class_id.slice(0, 8).toUpperCase(),
    targetScheduleText: r.target_schedule_text || "Chưa cập nhật lịch",
    note: r.note || undefined,
    expiresAt: r.expires_at ? r.expires_at.slice(0, 10) : "—",
    status: r.status,
    createdAt: r.created_at,
  };
}

function mapDiscover(d: ApiDiscover): DiscoverCard {
  return {
    requestId: d.id,
    myRequestId: d.for_request_id || undefined,
    studentDisplayName: d.student_display_name || "Sinh viên",
    studentCodeMasked: d.student_code_masked || "****",
    campusName: normalizeCampusName(d.campus_name),
    major: d.major || "—",
    semesterName: d.semester_name || "—",
    courseCode: d.course_code || "—",
    courseName: d.course_name || "",
    currentClassCode: d.current_class_code || "—",
    currentScheduleText: d.current_schedule_text || "Chưa cập nhật lịch",
    targetClassCode: d.target_class_code || "—",
    targetScheduleText: d.target_schedule_text || "Chưa cập nhật lịch",
    lecturerCurrent: d.lecturer_current || "Đang cập nhật",
    note: d.note || undefined,
    isReciprocalReady: d.is_reciprocal_ready,
  };
}

function mapMatch(m: ApiMatch): MatchItem {
  return {
    id: m.id,
    myRequestId: m.my_request_id || "",
    partnerRequestId: m.partner_request_id || "",
    partnerName: m.partner_name || "Sinh viên",
    partnerCampus: normalizeCampusName(m.partner_campus),
    courseCode: m.course_code || "—",
    courseName: m.course_name || "",
    semesterName: m.semester_name || "—",
    myClassCode: m.my_class_code || "—",
    partnerClassCode: m.partner_class_code || "—",
    status: m.status,
    myConfirmed: m.my_confirmed,
    partnerConfirmed: m.partner_confirmed,
    conversationId: m.conversation_id || "",
    createdAt: m.created_at,
  };
}

function mapConversation(c: ApiConversation, unreadCount: number): ConversationItem {
  return {
    id: c.id,
    matchId: c.match_id || "",
    partnerName: c.partner_name || "Sinh viên",
    courseCode: c.course_code || "—",
    myClassCode: c.my_class_code || "—",
    partnerClassCode: c.partner_class_code || "—",
    matchStatus: c.match_status || "PENDING_CONFIRMATION",
    lastMessage: c.last_message || "Hai bạn đã Match! Hãy bắt đầu trao đổi lịch đổi lớp.",
    lastMessageAt: c.last_message_at ? formatTime(c.last_message_at) : undefined,
    unreadCount,
  };
}

function mapNotification(n: ApiNotification): NotificationItem {
  return {
    id: n.id,
    title: n.title,
    body: n.body,
    type: n.notification_type,
    isRead: n.is_read,
    createdAt: formatRelative(n.created_at),
    href:
      n.notification_type === "MATCH"
        ? "/matches"
        : n.notification_type === "MESSAGE"
          ? "/chat"
          : undefined,
  };
}

async function safeFetch<T>(path: string): Promise<T | null> {
  try {
    return await apiFetch<T>(path);
  } catch {
    return null;
  }
}

const STORAGE_STUDENT_KEY = "fpt_classswap_student_v1";

function sanitizeCampuses(list: Campus[]): Campus[] {
  return list.map((c) => ({ ...c, name: normalizeCampusName(c.name) }));
}

interface AppStateContextValue {
  student: StudentProfile;
  campuses: Campus[];
  semesters: Semester[];
  courses: Course[];
  isAuthenticated: boolean;
  setAuthenticatedUser: (me: AuthMeResponse) => void;
  refreshAuth: () => Promise<AuthMeResponse | null>;
  logout: () => Promise<void>;
  updateStudent: (patch: Partial<StudentProfile>) => Promise<void>;
  requests: SwapRequest[];
  /** Creates a request. When logged in it is saved to the database; throws ApiError on failure. */
  addRequest: (req: Omit<SwapRequest, "id" | "studentId" | "status" | "createdAt">) => Promise<void>;
  updateRequestStatus: (id: string, status: SwapRequestStatus) => Promise<void>;
  discoverCards: DiscoverCard[];
  swipeCard: (
    requestId: string,
    action: SwipeAction
  ) => Promise<{ matched: boolean; match?: MatchItem }>;
  matches: MatchItem[];
  updateMatchStatus: (
    matchId: string,
    action: "confirm" | "decline" | "complete"
  ) => Promise<void>;
  conversations: ConversationItem[];
  messages: MessageItem[];
  sendMessage: (conversationId: string, content: string) => void;
  loadConversationMessages: (conversationId: string) => Promise<void>;
  realtimeStatus: RealtimeStatus;
  notifications: NotificationItem[];
  markNotificationRead: (id: string) => void;
  unreadNotificationsCount: number;
  unreadMessagesCount: number;
  refreshWorkspace: () => Promise<void>;
  soundEnabled: boolean;
  toggleSound: () => void;
  actionError: string | null;
  clearActionError: () => void;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [student, setStudent] = useState<StudentProfile>(GUEST_STUDENT);
  const [campuses, setCampuses] = useState<Campus[]>(DEMO_CAMPUSES);
  const [semesters, setSemesters] = useState<Semester[]>(DEMO_SEMESTERS);
  const [courses, setCourses] = useState<Course[]>(DEMO_COURSES);
  const [requests, setRequests] = useState<SwapRequest[]>(DEMO_REQUESTS);
  const [discoverCards, setDiscoverCards] = useState<DiscoverCard[]>(DEMO_DISCOVER_CARDS);
  const [matches, setMatches] = useState<MatchItem[]>(DEMO_MATCHES);
  const [conversations, setConversations] = useState<ConversationItem[]>(DEMO_CONVERSATIONS);
  const [messages, setMessages] = useState<MessageItem[]>(DEMO_MESSAGES);
  const [notifications, setNotifications] = useState<NotificationItem[]>(DEMO_NOTIFICATIONS);
  const [backendAuthed, setBackendAuthed] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const workspaceOwnerRef = useRef<string | null>(null);
  const seenNotifIdsRef = useRef<Set<string>>(new Set());
  const notifsInitializedRef = useRef(false);
  const seenConvStampRef = useRef<Map<string, string>>(new Map());
  const convsInitializedRef = useRef(false);
  const seenWsMessageIdsRef = useRef<Set<string>>(new Set());

  const reportError = useCallback((err: unknown, fallback: string) => {
    setActionError(err instanceof ApiError ? err.message : fallback);
  }, []);

  /** Reload requests / discover / matches / conversations / notifications from the database. */
  const refreshWorkspace = useCallback(async () => {
    const [reqs, cards, ms, convs, notifs] = await Promise.all([
      safeFetch<ApiRequest[]>("/class-swap/requests/me"),
      safeFetch<ApiDiscover[]>("/class-swap/discover"),
      safeFetch<ApiMatch[]>("/class-swap/matches"),
      safeFetch<ApiConversation[]>("/conversations"),
      safeFetch<ApiNotification[]>("/notifications"),
    ]);
    if (reqs) setRequests(reqs.map(mapRequest));
    if (cards) setDiscoverCards(cards.map(mapDiscover));
    if (ms) setMatches(ms.map(mapMatch));

    let ringMessage = false;
    let ringNotification = false;

    if (convs) {
      const nextStamps = new Map<string, string>();
      const bumpedUnread = new Set<string>();
      for (const c of convs) {
        const stamp = c.last_message_at || "";
        nextStamps.set(c.id, stamp);
        const prevStamp = seenConvStampRef.current.get(c.id);
        if (
          convsInitializedRef.current &&
          stamp &&
          stamp !== prevStamp &&
          c.last_message_sender_id &&
          c.last_message_sender_id !== workspaceOwnerRef.current
        ) {
          ringMessage = true;
          bumpedUnread.add(c.id);
        }
      }
      seenConvStampRef.current = nextStamps;
      convsInitializedRef.current = true;

      setConversations((prev) =>
        convs.map((c) => {
          const prevUnread = prev.find((p) => p.id === c.id)?.unreadCount ?? 0;
          return mapConversation(c, bumpedUnread.has(c.id) ? prevUnread + 1 : prevUnread);
        })
      );
    }

    if (notifs) {
      for (const n of notifs) {
        if (notifsInitializedRef.current && !n.is_read && !seenNotifIdsRef.current.has(n.id)) {
          ringNotification = true;
        }
        seenNotifIdsRef.current.add(n.id);
      }
      notifsInitializedRef.current = true;
      setNotifications(notifs.map(mapNotification));
    }

    if (ringMessage) {
      playNotificationBell("message");
    } else if (ringNotification) {
      playNotificationBell("notification");
    }
  }, []);

  const applyAuthMe = useCallback(
    (me: AuthMeResponse, campusList: Campus[]) => {
      const matchedCampus = campusList.find(
        (c) => c.id === me.campus_id || (me.campus_code && c.code === me.campus_code)
      );
      const fallbackName = me.email ? me.email.split("@")[0] : "Sinh viên";
      const nextProfile: StudentProfile = {
        id: me.id,
        email: me.email,
        studentCode: me.student_code,
        role: me.role,
        fullName: me.full_name?.trim() || fallbackName,
        major: me.major?.trim() || "Software Engineering",
        campusId: me.campus_id || matchedCampus?.id || campusList[0]?.id || "campus-hl",
        campusName: normalizeCampusName(me.campus_name || matchedCampus?.name || "Hà Nội"),
        avatarUrl: me.avatar_url || undefined,
      };
      setBackendAuthed(true);
      setStudent(nextProfile);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(STORAGE_STUDENT_KEY, JSON.stringify(nextProfile));
        } catch {
          // ignore storage error
        }
      }

      // A different account logged in → drop everything the previous one saw.
      if (workspaceOwnerRef.current !== me.id) {
        workspaceOwnerRef.current = me.id;
        seenNotifIdsRef.current = new Set();
        notifsInitializedRef.current = false;
        seenConvStampRef.current = new Map();
        convsInitializedRef.current = false;
        seenWsMessageIdsRef.current = new Set();
        setRequests([]);
        setDiscoverCards([]);
        setMatches([]);
        setConversations([]);
        setMessages([]);
        setNotifications([]);
      }
      void refreshWorkspace();
    },
    [refreshWorkspace]
  );

  const setAuthenticatedUser = useCallback(
    (me: AuthMeResponse) => {
      applyAuthMe(me, campuses);
    },
    [applyAuthMe, campuses]
  );

  const clearAuthSession = useCallback(() => {
    workspaceOwnerRef.current = null;
    seenNotifIdsRef.current = new Set();
    notifsInitializedRef.current = false;
    seenConvStampRef.current = new Map();
    convsInitializedRef.current = false;
    seenWsMessageIdsRef.current = new Set();
    setBackendAuthed(false);
    setStudent(GUEST_STUDENT);
    setRequests(DEMO_REQUESTS);
    setDiscoverCards(DEMO_DISCOVER_CARDS);
    setMatches(DEMO_MATCHES);
    setConversations(DEMO_CONVERSATIONS);
    setMessages(DEMO_MESSAGES);
    setNotifications(DEMO_NOTIFICATIONS);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(STORAGE_STUDENT_KEY);
      } catch {
        // ignore storage error
      }
    }
  }, []);

  const refreshAuth = useCallback(async (): Promise<AuthMeResponse | null> => {
    try {
      const me = await apiFetch<AuthMeResponse>("/auth/me");
      applyAuthMe(me, campuses);
      return me;
    } catch {
      clearAuthSession();
      return null;
    }
  }, [applyAuthMe, campuses, clearAuthSession]);

  const logout = useCallback(async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {
      // ignore logout error
    }
    clearAuthSession();
  }, [clearAuthSession]);

  useEffect(() => {
    let active = true;

    /* eslint-disable react-hooks/set-state-in-effect */
    initSoundUnlock();
    setSoundEnabled(isSoundEnabled());
    // Hydrate the cached account immediately to avoid flashing guest/demo data on reload.
    if (typeof window !== "undefined") {
      try {
        const cached = window.localStorage.getItem(STORAGE_STUDENT_KEY);
        if (cached) {
          const parsed = JSON.parse(cached) as StudentProfile;
          parsed.campusName = normalizeCampusName(parsed.campusName);
          setStudent(parsed);
          setBackendAuthed(true);
          workspaceOwnerRef.current = parsed.id;
          setRequests([]);
          setDiscoverCards([]);
          setMatches([]);
          setConversations([]);
          setMessages([]);
          setNotifications([]);
        }
      } catch {
        // ignore parse error
      }
    }
    /* eslint-enable react-hooks/set-state-in-effect */

    (async () => {
      let loadedCampuses = DEMO_CAMPUSES;

      const [dbCampuses, dbSemesters, dbCourses] = await Promise.all([
        safeFetch<Campus[]>("/academic/campuses"),
        safeFetch<
          Array<{ id: string; code: string; name: string; is_active: boolean }>
        >("/academic/semesters"),
        safeFetch<Course[]>("/academic/courses"),
      ]);
      if (!active) return;

      if (dbCampuses && dbCampuses.length > 0) {
        loadedCampuses = sanitizeCampuses(dbCampuses);
        setCampuses(loadedCampuses);
      }
      if (dbSemesters && dbSemesters.length > 0) {
        setSemesters(
          dbSemesters.map((s) => ({
            id: s.id,
            code: s.code,
            name: s.name,
            isActive: s.is_active,
          }))
        );
      }
      if (dbCourses && dbCourses.length > 0) {
        setCourses(dbCourses);
      }

      try {
        const me = await apiFetch<AuthMeResponse>("/auth/me");
        if (!active) return;
        applyAuthMe(me, loadedCampuses);
      } catch {
        if (!active) return;
        clearAuthSession();
      }
    })();
    return () => {
      active = false;
    };
  }, [applyAuthMe, clearAuthSession]);

  // Keep Discover / Matches fresh even when the realtime socket is unavailable (e.g. serverless hosting).
  useEffect(() => {
    if (!backendAuthed) return;
    const timer = setInterval(() => {
      if (typeof document === "undefined" || document.visibilityState === "visible") {
        void refreshWorkspace();
      }
    }, 20000);
    return () => clearInterval(timer);
  }, [backendAuthed, refreshWorkspace]);

  const handleRealtimeEvent = useCallback(
    (event: RealtimeEvent) => {
      if (event.type === "match.created" || event.type === "match.updated") {
        void refreshWorkspace();
        return;
      }
      if (event.type === "chat.message.new" && event.data) {
        const raw = event.data as {
          id: string;
          conversation_id: string;
          sender_id: string;
          client_message_id?: string | null;
          content: string;
          created_at: string;
        };
        const incoming: MessageItem = {
          id: raw.id,
          conversationId: raw.conversation_id,
          senderId: raw.sender_id,
          clientMessageId: raw.client_message_id || raw.id,
          content: raw.content,
          createdAt: formatTime(raw.created_at),
          pending: false,
          failed: false,
        };

        if (
          incoming.senderId !== student.id &&
          !seenWsMessageIdsRef.current.has(incoming.id)
        ) {
          seenWsMessageIdsRef.current.add(incoming.id);
          seenConvStampRef.current.set(incoming.conversationId, raw.created_at);
          playNotificationBell("message");
        }

        setMessages((prev) => {
          const idx = prev.findIndex(
            (m) =>
              m.id === incoming.id ||
              (incoming.clientMessageId && m.clientMessageId === incoming.clientMessageId)
          );
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = incoming;
            return copy;
          }
          return [...prev, incoming];
        });

        setConversations((prev) =>
          prev.map((c) =>
            c.id === incoming.conversationId
              ? {
                  ...c,
                  lastMessage: incoming.content,
                  lastMessageAt: incoming.createdAt,
                  unreadCount:
                    incoming.senderId === student.id ? c.unreadCount : c.unreadCount + 1,
                }
              : c
          )
        );
      } else if (event.type === "error" && event.client_message_id) {
        setMessages((prev) =>
          prev.map((m) =>
            m.clientMessageId === event.client_message_id
              ? { ...m, pending: false, failed: true }
              : m
          )
        );
      }
    },
    [student.id, refreshWorkspace]
  );

  const { status: realtimeStatus, sendEvent } = useRealtimeSocket({
    enabled: backendAuthed,
    onEvent: handleRealtimeEvent,
  });

  const loadConversationMessages = useCallback(
    async (conversationId: string) => {
      if (!backendAuthed) return;
      try {
        const rows = await apiFetch<
          Array<{
            id: string;
            conversation_id: string;
            sender_id: string;
            client_message_id?: string | null;
            content: string;
            created_at: string;
          }>
        >(`/conversations/${conversationId}/messages?limit=50`);
        const mapped: MessageItem[] = rows
          .slice()
          .reverse()
          .map((r) => ({
            id: r.id,
            conversationId: r.conversation_id,
            senderId: r.sender_id,
            clientMessageId: r.client_message_id || r.id,
            content: r.content,
            createdAt: formatTime(r.created_at),
          }));

        setMessages((prev) => {
          const others = prev.filter((m) => m.conversationId !== conversationId);
          return [...others, ...mapped];
        });
        setConversations((prev) =>
          prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
        );
      } catch {
        // Ignore if conversation is local demo only
      }
    },
    [backendAuthed]
  );

  const updateStudent = async (patch: Partial<StudentProfile>) => {
    const cleanedPatch: Partial<StudentProfile> = {
      ...patch,
      ...(patch.campusName ? { campusName: normalizeCampusName(patch.campusName) } : {}),
    };
    if (backendAuthed) {
      await apiFetch("/students/me", {
        method: "PUT",
        body: JSON.stringify({
          full_name: cleanedPatch.fullName,
          major: cleanedPatch.major,
          campus_id: cleanedPatch.campusId,
          avatar_url: cleanedPatch.avatarUrl,
        }),
      });
    }
    setStudent((prev) => {
      const next = { ...prev, ...cleanedPatch };
      if (backendAuthed && typeof window !== "undefined") {
        try {
          window.localStorage.setItem(STORAGE_STUDENT_KEY, JSON.stringify(next));
        } catch {
          // ignore storage error
        }
      }
      return next;
    });
    if (backendAuthed) {
      // Campus/major changes can change which candidates are visible.
      void refreshWorkspace();
    }
  };

  const addRequest = async (
    req: Omit<SwapRequest, "id" | "studentId" | "status" | "createdAt">
  ) => {
    if (backendAuthed) {
      await apiFetch("/class-swap/requests", {
        method: "POST",
        body: JSON.stringify({
          semester_id: req.semesterId,
          course_id: req.courseId,
          current_class_id: req.currentClassId,
          target_class_id: req.targetClassId,
          note: req.note ?? null,
          expires_at: req.expiresAt ? `${req.expiresAt}T23:59:59Z` : null,
        }),
      });
      await refreshWorkspace();
      return;
    }

    const newReq: SwapRequest = {
      ...req,
      id: `req-${Date.now()}`,
      studentId: student.id,
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
    };
    setRequests((prev) => [newReq, ...prev]);
  };

  const updateRequestStatus = async (id: string, status: SwapRequestStatus) => {
    if (backendAuthed) {
      try {
        if (status === "CANCELLED") {
          await apiFetch(`/class-swap/requests/${id}`, { method: "DELETE" });
        } else {
          await apiFetch(`/class-swap/requests/${id}`, {
            method: "PUT",
            body: JSON.stringify({ status }),
          });
        }
      } catch (err) {
        reportError(err, "Không thể cập nhật yêu cầu. Vui lòng thử lại.");
      }
      await refreshWorkspace();
      return;
    }
    setRequests((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item))
    );
  };

  const swipeCard = async (
    requestId: string,
    action: SwipeAction
  ): Promise<{ matched: boolean; match?: MatchItem }> => {
    const card = discoverCards.find((c) => c.requestId === requestId);

    if (backendAuthed) {
      if (!card?.myRequestId) {
        setDiscoverCards((prev) => prev.filter((c) => c.requestId !== requestId));
        return { matched: false };
      }
      try {
        const res = await apiFetch<ApiSwipe>("/class-swap/swipes", {
          method: "POST",
          body: JSON.stringify({
            swiper_request_id: card.myRequestId,
            target_request_id: card.requestId,
            action,
          }),
        });
        setDiscoverCards((prev) => prev.filter((c) => c.requestId !== requestId));
        if (res.match && res.match_created) {
          const match = mapMatch(res.match);
          setMatches((prev) => [match, ...prev.filter((m) => m.id !== match.id)]);
          void refreshWorkspace();
          return { matched: true, match };
        }
        return { matched: false };
      } catch (err) {
        reportError(err, "Không thể ghi nhận lượt quẹt. Vui lòng thử lại.");
        if (err instanceof ApiError && (err.status === 404 || err.status === 422)) {
          // Candidate is gone (cancelled / matched elsewhere) — drop the stale card.
          setDiscoverCards((prev) => prev.filter((c) => c.requestId !== requestId));
        }
        return { matched: false };
      }
    }

    // ── Guest/demo mode ──
    setDiscoverCards((prev) => prev.filter((c) => c.requestId !== requestId));
    if (!card || action === "PASS" || !card.isReciprocalReady) {
      return { matched: false };
    }

    const matchId = `match-${Date.now()}`;
    const convId = `conv-${Date.now()}`;
    const newMatch: MatchItem = {
      id: matchId,
      myRequestId: requests[0]?.id || "req-1",
      partnerRequestId: card.requestId,
      partnerName: card.studentDisplayName,
      partnerCampus: normalizeCampusName(card.campusName),
      courseCode: card.courseCode,
      courseName: card.courseName,
      semesterName: card.semesterName,
      myClassCode: card.targetClassCode,
      partnerClassCode: card.currentClassCode,
      status: "PENDING_CONFIRMATION",
      myConfirmed: false,
      partnerConfirmed: false,
      conversationId: convId,
      createdAt: new Date().toISOString(),
    };

    const newConv: ConversationItem = {
      id: convId,
      matchId,
      partnerName: card.studentDisplayName,
      courseCode: card.courseCode,
      myClassCode: card.targetClassCode,
      partnerClassCode: card.currentClassCode,
      matchStatus: "PENDING_CONFIRMATION",
      lastMessage: "Hai bạn đã Match! Hãy bắt đầu trao đổi lịch đổi lớp.",
      lastMessageAt: "Vừa xong",
      unreadCount: 0,
    };

    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: `Match mới cho môn ${card.courseCode}!`,
      body: `Bạn và ${card.studentDisplayName} đã cùng Like (${card.targetClassCode} ⇄ ${card.currentClassCode}).`,
      type: "MATCH",
      isRead: false,
      createdAt: "Vừa xong",
      href: "/chat",
    };

    setMatches((prev) => [newMatch, ...prev]);
    setConversations((prev) => [newConv, ...prev]);
    setNotifications((prev) => [newNotif, ...prev]);

    return { matched: true, match: newMatch };
  };

  const updateMatchStatus = async (
    matchId: string,
    action: "confirm" | "decline" | "complete"
  ) => {
    if (backendAuthed) {
      try {
        const updated = await apiFetch<ApiMatch>(`/class-swap/matches/${matchId}/${action}`, {
          method: "POST",
        });
        const mapped = mapMatch(updated);
        setMatches((prev) => prev.map((m) => (m.id === mapped.id ? mapped : m)));
        setConversations((prev) =>
          prev.map((c) => (c.matchId === mapped.id ? { ...c, matchStatus: mapped.status } : c))
        );
      } catch (err) {
        reportError(err, "Không thể cập nhật trạng thái Match. Vui lòng thử lại.");
      }
      await refreshWorkspace();
      return;
    }

    let nextStatus: MatchStatus = "PENDING_CONFIRMATION";
    setMatches((prev) =>
      prev.map((m) => {
        if (m.id !== matchId) return m;
        if (action === "decline") {
          nextStatus = "DECLINED";
          return { ...m, status: "DECLINED" };
        }
        if (action === "complete") {
          nextStatus = "COMPLETED";
          return { ...m, status: "COMPLETED" };
        }
        const myConfirmed = true;
        const bothConfirmed = myConfirmed && m.partnerConfirmed;
        nextStatus = bothConfirmed ? "CONFIRMED" : "PENDING_CONFIRMATION";
        return { ...m, myConfirmed, status: nextStatus };
      })
    );

    setConversations((prev) =>
      prev.map((c) => (c.matchId === matchId ? { ...c, matchStatus: nextStatus } : c))
    );
  };

  const sendMessage = (conversationId: string, content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;
    const clientMessageId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `cm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const optimisticMsg: MessageItem = {
      id: `temp-${clientMessageId}`,
      conversationId,
      senderId: student.id,
      clientMessageId,
      content: trimmed,
      createdAt: timeStr,
      pending: backendAuthed,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? { ...c, lastMessage: trimmed, lastMessageAt: timeStr, unreadCount: 0 }
          : c
      )
    );

    if (!backendAuthed) return;

    const sentViaWs = sendEvent({
      type: "chat.message.send",
      conversation_id: conversationId,
      content: trimmed,
      client_message_id: clientMessageId,
    });

    if (!sentViaWs) {
      apiFetch<{
        id: string;
        conversation_id: string;
        sender_id: string;
        client_message_id?: string | null;
        content: string;
        created_at: string;
      }>(`/conversations/${conversationId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: trimmed, client_message_id: clientMessageId }),
      })
        .then((saved) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.clientMessageId === clientMessageId
                ? {
                    id: saved.id,
                    conversationId: saved.conversation_id,
                    senderId: saved.sender_id,
                    clientMessageId: saved.client_message_id || clientMessageId,
                    content: saved.content,
                    createdAt: formatTime(saved.created_at),
                    pending: false,
                  }
                : m
            )
          );
        })
        .catch(() => {
          setMessages((prev) =>
            prev.map((m) =>
              m.clientMessageId === clientMessageId ? { ...m, pending: false, failed: true } : m
            )
          );
        });
    }
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    if (backendAuthed) {
      void apiFetch(`/notifications/${id}/read`, { method: "PATCH" }).catch(() => {});
    }
  };

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      setSoundEnabledPref(next);
      if (next) {
        playNotificationBell("notification", true);
      }
      return next;
    });
  }, []);

  const clearActionError = useCallback(() => setActionError(null), []);

  const unreadNotificationsCount = notifications.filter((n) => !n.isRead).length;
  const unreadMessagesCount = conversations.reduce((acc, c) => acc + c.unreadCount, 0);

  return (
    <AppStateContext.Provider
      value={{
        student,
        campuses,
        semesters,
        courses,
        isAuthenticated: backendAuthed,
        setAuthenticatedUser,
        refreshAuth,
        logout,
        updateStudent,
        requests,
        addRequest,
        updateRequestStatus,
        discoverCards,
        swipeCard,
        matches,
        updateMatchStatus,
        conversations,
        messages,
        sendMessage,
        loadConversationMessages,
        realtimeStatus,
        notifications,
        markNotificationRead,
        unreadNotificationsCount,
        unreadMessagesCount,
        refreshWorkspace,
        soundEnabled,
        toggleSound,
        actionError,
        clearActionError,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error("useAppState must be used inside AppStateProvider");
  }
  return ctx;
}
