"use client";

import React, { createContext, useContext, useState } from "react";
import {
  DEMO_CONVERSATIONS,
  DEMO_DISCOVER_CARDS,
  DEMO_MATCHES,
  DEMO_MESSAGES,
  DEMO_NOTIFICATIONS,
  DEMO_REQUESTS,
  DEMO_STUDENT,
} from "@/lib/demo-data";
import {
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

interface AppStateContextValue {
  student: StudentProfile;
  updateStudent: (patch: Partial<StudentProfile>) => void;
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
  notifications: NotificationItem[];
  markNotificationRead: (id: string) => void;
  unreadNotificationsCount: number;
  unreadMessagesCount: number;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [student, setStudent] = useState<StudentProfile>(DEMO_STUDENT);
  const [requests, setRequests] = useState<SwapRequest[]>(DEMO_REQUESTS);
  const [discoverCards, setDiscoverCards] = useState<DiscoverCard[]>(DEMO_DISCOVER_CARDS);
  const [matches, setMatches] = useState<MatchItem[]>(DEMO_MATCHES);
  const [conversations, setConversations] = useState<ConversationItem[]>(DEMO_CONVERSATIONS);
  const [messages, setMessages] = useState<MessageItem[]>(DEMO_MESSAGES);
  const [notifications, setNotifications] = useState<NotificationItem[]>(DEMO_NOTIFICATIONS);

  const updateStudent = (patch: Partial<StudentProfile>) => {
    setStudent((prev) => ({ ...prev, ...patch }));
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
    setRequests((prev) => [newReq, ...prev]);
  };

  const updateRequestStatus = (id: string, status: SwapRequestStatus) => {
    setRequests((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item))
    );
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
      partnerCampus: card.campusName,
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

    const newMsg: MessageItem = {
      id: `msg-${Date.now()}`,
      conversationId,
      senderId: student.id,
      clientMessageId: `cm-${Date.now()}`,
      content: trimmed,
      createdAt: timeStr,
    };

    setMessages((prev) => [...prev, newMsg]);
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? { ...c, lastMessage: trimmed, lastMessageAt: timeStr, unreadCount: 0 }
          : c
      )
    );
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const unreadNotificationsCount = notifications.filter((n) => !n.isRead).length;
  const unreadMessagesCount = conversations.reduce((acc, c) => acc + c.unreadCount, 0);

  return (
    <AppStateContext.Provider
      value={{
        student,
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

