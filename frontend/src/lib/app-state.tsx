"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
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
  DiscoverCard,
  MatchItem,
  MatchStatus,
  MessageItem,
  NotificationItem,
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

const STORAGE_STUDENT_KEY = "fpt_classswap_student_v1";
const STORAGE_REQUESTS_PREFIX = "fpt_classswap_reqs_v1_";

function sanitizeCampuses(list: Campus[]): Campus[] {
  return list.map((c) => ({
    ...c,
    name: normalizeCampusName(c.name),
  }));
}

interface AppStateContextValue {
  student: StudentProfile;
  campuses: Campus[];
  isAuthenticated: boolean;
  setAuthenticatedUser: (me: AuthMeResponse) => void;
  refreshAuth: () => Promise<AuthMeResponse | null>;
  logout: () => Promise<void>;
  updateStudent: (patch: Partial<StudentProfile>) => Promise<void>;
  requests: SwapRequest[];
  addRequest: (req: Omit<SwapRequest, "id" | "studentId" | "status" | "createdAt">) => void;
  updateRequestStatus: (id: string, status: SwapRequestStatus) => void;
  discoverCards: DiscoverCard[];
  swipeCard: (requestId: string, action: SwipeAction) => { matched: boolean; match?: MatchItem };
  matches: MatchItem[];
  updateMatchStatus: (matchId: string, action: "confirm" | "decline" | "complete") => void;
  conversations: ConversationItem[];
  messages: MessageItem[];
  sendMessage: (conversationId: string, content: string) => void;
  loadConversationMessages: (conversationId: string) => Promise<void>;
  realtimeStatus: RealtimeStatus;
  notifications: NotificationItem[];
  markNotificationRead: (id: string) => void;
  unreadNotificationsCount: number;
  unreadMessagesCount: number;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [student, setStudent] = useState<StudentProfile>(GUEST_STUDENT);
  const [campuses, setCampuses] = useState<Campus[]>(DEMO_CAMPUSES);
  const [requests, setRequests] = useState<SwapRequest[]>(DEMO_REQUESTS);
  const [discoverCards, setDiscoverCards] = useState<DiscoverCard[]>(DEMO_DISCOVER_CARDS);
  const [matches, setMatches] = useState<MatchItem[]>(DEMO_MATCHES);
  const [conversations, setConversations] = useState<ConversationItem[]>(DEMO_CONVERSATIONS);
  const [messages, setMessages] = useState<MessageItem[]>(DEMO_MESSAGES);
  const [notifications, setNotifications] = useState<NotificationItem[]>(DEMO_NOTIFICATIONS);
  const [backendAuthed, setBackendAuthed] = useState(false);

  const formatTime = (isoOrTime: string) => {
    const d = new Date(isoOrTime);
    if (Number.isNaN(d.getTime())) return isoOrTime;
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const loadUserWorkspaceData = useCallback(async (studentId: string) => {
    // Load per-account saved requests + backend requests/notifications/matches/conversations
    let localReqs: SwapRequest[] = [];
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(`${STORAGE_REQUESTS_PREFIX}${studentId}`);
        if (raw) {
          localReqs = JSON.parse(raw) as SwapRequest[];
        }
      } catch {
        // ignore storage error
      }
    }

    try {
      const apiReqs = await apiFetch<
        Array<{
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
        }>
      >("/class-swap/requests/me");

      const mappedReqs: SwapRequest[] = apiReqs.map((r) => {
        const crs = DEMO_COURSES.find((c) => c.id === r.course_id);
        const sem = DEMO_SEMESTERS.find((s) => s.id === r.semester_id);
        return {
          id: r.id,
          studentId: r.student_id,
          semesterId: r.semester_id,
          semesterName: sem?.name || "Fall 2025",
          courseId: r.course_id,
          courseCode: crs?.code || "COURSE",
          courseName: crs?.name || "Môn học",
          currentClassId: r.current_class_id,
          currentClassCode: r.current_class_id.slice(0, 8).toUpperCase(),
          currentScheduleText: "Theo lịch lớp hiện tại",
          targetClassId: r.target_class_id,
          targetClassCode: r.target_class_id.slice(0, 8).toUpperCase(),
          targetScheduleText: "Theo lịch lớp mong muốn",
          note: r.note || undefined,
          expiresAt: r.expires_at ? r.expires_at.slice(0, 10) : "2026-12-20",
          status: r.status,
          createdAt: r.created_at,
        };
      });
      const mergedIds = new Set(mappedReqs.map((r) => r.id));
      setRequests([...mappedReqs, ...localReqs.filter((r) => !mergedIds.has(r.id))]);
    } catch {
      setRequests(localReqs);
    }

    try {
      const apiNotifs = await apiFetch<
        Array<{
          id: string;
          notification_type: NotificationItem["type"];
          title: string;
          body: string;
          is_read: boolean;
          created_at: string;
        }>
      >("/notifications");
      setNotifications(
        apiNotifs.map((n) => ({
          id: n.id,
          title: n.title,
          body: n.body,
          type: n.notification_type,
          isRead: n.is_read,
          createdAt: formatTime(n.created_at),
        }))
      );
    } catch {
      setNotifications([]);
    }

    setMatches([]);
    setConversations([]);
    setMessages([]);
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
      void loadUserWorkspaceData(me.id);
    },
    [loadUserWorkspaceData]
  );

  const setAuthenticatedUser = useCallback(
    (me: AuthMeResponse) => {
      applyAuthMe(me, campuses);
    },
    [applyAuthMe, campuses]
  );

  const clearAuthSession = useCallback(() => {
    setBackendAuthed(false);
    setStudent(GUEST_STUDENT);
    setRequests(DEMO_REQUESTS);
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

    // Hydrate cached student immediately to avoid flashing Guest state on reload
    if (typeof window !== "undefined") {
      try {
        const cached = window.localStorage.getItem(STORAGE_STUDENT_KEY);
        if (cached) {
          const parsed = JSON.parse(cached) as StudentProfile;
          parsed.campusName = normalizeCampusName(parsed.campusName);
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setStudent(parsed);
          setBackendAuthed(true);
        }
      } catch {
        // ignore parse error
      }
    }

    (async () => {
      let loadedCampuses = DEMO_CAMPUSES;
      try {
        const dbCampuses = await apiFetch<Campus[]>("/academic/campuses");
        if (active && dbCampuses.length > 0) {
          loadedCampuses = sanitizeCampuses(dbCampuses);
          setCampuses(loadedCampuses);
        }
      } catch {
        // Keep fallback DEMO_CAMPUSES
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

  const handleRealtimeEvent = useCallback(
    (event: RealtimeEvent) => {
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

        setConversations((prev) => {
          const updated = prev.map((c) =>
            c.id === incoming.conversationId
              ? {
                  ...c,
                  lastMessage: incoming.content,
                  lastMessageAt: incoming.createdAt,
                  unreadCount:
                    incoming.senderId === student.id ? c.unreadCount : c.unreadCount + 1,
                }
              : c
          );
          return updated;
        });
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
    [student.id]
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
  };

  const addRequest = (
    req: Omit<SwapRequest, "id" | "studentId" | "status" | "createdAt">
  ) => {
    const newReq: SwapRequest = {
      ...req,
      id: `req-${Date.now()}`,
      studentId: student.id,
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
    };
    setRequests((prev) => {
      const next = [newReq, ...prev];
      if (backendAuthed && typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            `${STORAGE_REQUESTS_PREFIX}${student.id}`,
            JSON.stringify(next)
          );
        } catch {
          // ignore storage error
        }
      }
      return next;
    });
  };

  const updateRequestStatus = (id: string, status: SwapRequestStatus) => {
    setRequests((prev) => {
      const next = prev.map((item) => (item.id === id ? { ...item, status } : item));
      if (backendAuthed && typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            `${STORAGE_REQUESTS_PREFIX}${student.id}`,
            JSON.stringify(next)
          );
        } catch {
          // ignore storage error
        }
      }
      return next;
    });
  };

  const swipeCard = (
    requestId: string,
    action: SwipeAction
  ): { matched: boolean; match?: MatchItem } => {
    const card = discoverCards.find((c) => c.requestId === requestId);
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

  const updateMatchStatus = (
    matchId: string,
    action: "confirm" | "decline" | "complete"
  ) => {
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

  const unreadNotificationsCount = notifications.filter((n) => !n.isRead).length;
  const unreadMessagesCount = conversations.reduce((acc, c) => acc + c.unreadCount, 0);

  return (
    <AppStateContext.Provider
      value={{
        student,
        campuses,
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
