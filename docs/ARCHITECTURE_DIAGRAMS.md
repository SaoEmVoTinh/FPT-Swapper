# FPT ClassSwap — Sơ đồ Kiến trúc & Cấu trúc Dự án

Tài liệu này tổng hợp các sơ đồ kiến trúc, cấu trúc thư mục, mô hình dữ liệu (ERD), luồng nghiệp vụ và vòng đời trạng thái của **FPT ClassSwap** dựa trên [FPT_ClassSwap_Project_Plan.md](../FPT_ClassSwap_Project_Plan.md) và mã nguồn hiện tại.

---

## 1. Kiến trúc tổng thể hệ thống (System Architecture)

```text
                       +-----------------------------+
                       |   Student / Admin Browser   |
                       |    (Desktop & Mobile Web)   |
                       +--------------+--------------+
                                      | HTTPS
                                      v
+----------------------------------------------------------------------------+
|                Next.js Frontend (React + TypeScript + Tailwind)            |
|  - App Router Pages (/discover, /requests, /matches, /chat, /admin)        |
|  - Client State & API Layer (src/lib/api.ts, src/lib/app-state.tsx)        |
+-------------------------------------+--------------------------------------+
                                      | REST JSON (/api/v1) & WebSocket
                                      v
+----------------------------------------------------------------------------+
|                  Python FastAPI Backend (Modular Monolith)                 |
|                                                                            |
|  +------+  +----------+  +----------+  +------------+  +----------------+  |
|  | auth |  | students |  | academic |  | class_swap |  | matching       |  |
|  +------+  +----------+  +----------+  +------------+  +----------------+  |
|  +------+  +---------------+  +---------+  +-------+                       |
|  | chat |  | notifications |  | reports |  | admin |                       |
|  +------+  +---------------+  +---------+  +-------+                       |
+-------------------------------------+--------------------------------------+
                                      |
                        +-------------+-------------+
                        |                           |
                        v                           v
          +---------------------------+   +-------------------+
          |   SQLAlchemy + Alembic    |   | Redis (Optional)  |
          +-------------+-------------+   | Cache / PubSub    |
                        |                 +-------------------+
                        v
          +---------------------------+
          |        PostgreSQL         |
          +---------------------------+
```

---

## 2. Cấu trúc thư mục dự án (Repository Structure)

```text
FPTSwapper/
├── FPT_ClassSwap_Project_Plan.md        # Tài liệu kế hoạch & định hướng dự án
├── README.md                            # Hướng dẫn chạy project
├── docker-compose.yml                   # Postgres + Backend + Frontend
├── .env.example                         # Biến môi trường mẫu
├── docs/
│   └── ARCHITECTURE_DIAGRAMS.md         # Tài liệu sơ đồ kiến trúc (file này)
│
├── frontend/                            # Next.js (App Router) + TypeScript + Tailwind
│   └── src/
│       ├── app/
│       │   ├── page.tsx                 # Landing Page
│       │   ├── login/page.tsx           # Đăng nhập
│       │   ├── register/page.tsx        # Đăng ký
│       │   ├── dashboard/page.tsx       # Tổng quan sinh viên
│       │   ├── discover/page.tsx        # Quẹt Like/Pass kiểu Tinder
│       │   ├── requests/
│       │   │   ├── page.tsx             # Danh sách yêu cầu của tôi
│       │   │   └── new/page.tsx         # Tạo yêu cầu đổi lớp
│       │   ├── matches/page.tsx         # Danh sách Match & Confirm/Decline
│       │   ├── chat/page.tsx            # Chat 1-1 sau khi Match
│       │   ├── notifications/page.tsx   # Trung tâm thông báo
│       │   ├── profile/page.tsx         # Hồ sơ sinh viên
│       │   └── admin/page.tsx           # Quản trị dữ liệu học vụ
│       ├── components/
│       │   ├── AppShell.tsx             # Sidebar desktop & Bottom nav mobile
│       │   ├── DisclaimerBanner.tsx     # Lưu ý không thay thế đăng ký chính thức
│       │   └── StatusBadge.tsx          # Badge trạng thái Request & Match
│       ├── lib/
│       │   ├── api.ts                   # HTTP client (/api/v1)
│       │   ├── app-state.tsx            # State tương tác frontend
│       │   └── demo-data.ts             # Dữ liệu preview
│       └── types/index.ts               # TypeScript interfaces & enums
│
└── backend/                             # FastAPI Modular Monolith
    ├── Dockerfile
    ├── requirements.txt
    └── app/
        ├── main.py                      # FastAPI entrypoint (/health, /api/v1/health)
        ├── common/enums.py              # UserRole, SwapRequestStatus, MatchStatus...
        ├── core/config.py               # Settings & CORS
        ├── database/models/             # ORM models (giai đoạn tiếp theo)
        ├── modules/                     # auth, students, academic, class_swap,
        │                                # matching, chat, notifications, reports, admin
        └── tests/test_health.py         # Pytest health check
```

---

## 3. Sơ đồ cơ sở dữ liệu cốt lõi (Core ERD)

```text
  [campuses] 1 ────< * [students] 1 ──── 1 [student_profiles]
      |                    |
      | 1                  | 1
      |                    v *
      |            [matching_requests]
      |              |            |
      v *            | *          | *
  [classes] <────────+            +──────> [swipes]
      ^ *                                     |
      |                                       v (Mutual Like)
  [courses] 1 ────< * [classes] * >──── 1 [semesters]
      |                                       |
      v *                                     v
  [class_schedules]                       [matches] 1 ──── 1 [conversations]
                                                                 |       |
                                                                 v *     v *
                                              [conversation_members]   [messages]
```

---

## 4. Luồng nghiệp vụ Matching & Chat 1-1

```text
  Sinh viên A                  FastAPI + Matching Engine               Sinh viên B
  (MKT201_01 -> MKT201_02)                                   (MKT201_02 -> MKT201_01)
       |                                  |                                |
       |-- POST /class-swap/requests ---->|                                |
       |                                  |<-- POST /class-swap/requests --|
       |                                  |                                |
       |-- GET /class-swap/discover ----->| (Lọc tương thích 2 chiều)      |
       |<-- Trả về Request của B ---------|                                |
       |                                  |                                |
       |-- POST /class-swap/swipes (LIKE)>| (Lưu Swipe A->B, chưa Match)   |
       |                                  |<-- POST /class-swap/swipes ----|
       |                                  |    (LIKE A -> Mutual Like!)    |
       |                                  |                                |
       |                                  |-- Transaction:                 |
       |                                  |   1. Tạo 1 Match duy nhất      |
       |                                  |   2. Tạo 1 Conversation 1-1    |
       |<-- Notification: Match mới! -----|-- Notification: Match mới! --->|
       |                                  |                                |
       |-- WS SEND_MESSAGE -------------->|-- Lưu DB & gửi MESSAGE_NEW --->|
       |                                  |                                |
       |-- POST /matches/{id}/confirm --->|<-- POST /matches/{id}/confirm -|
       |<========== Match -> CONFIRMED (Tự làm thủ tục với trường) =======>|
```

---

## 5. Vòng đời trạng thái (State Transitions)

### 5.1. Trạng thái Yêu cầu đổi lớp (`SwapRequestStatus`)

```text
  [DRAFT] ──> [ACTIVE] ──> [MATCHED] ──> [COMPLETED]
                |  ^  \
                |  |   ├──> [CANCELLED]
                v  |   └──> [EXPIRED]
              [PAUSED]
                |
                └──> [CANCELLED]
```

### 5.2. Trạng thái Kết nối (`MatchStatus`)

```text
  [PENDING_CONFIRMATION] ──(Cả hai xác nhận)──> [CONFIRMED] ──> [COMPLETED]
            |                                        |
            └──(Từ chối)──> [DECLINED]               └──(Hủy)──> [CANCELLED]
```
