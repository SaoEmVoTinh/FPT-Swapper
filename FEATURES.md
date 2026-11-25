# FPT ClassSwap — Tổng hợp Tính năng Hệ thống

> **Lưu ý:** FPT ClassSwap là nền tảng hỗ trợ kết nối sinh viên tìm người đổi lớp tương thích hai chiều, **không phải hệ thống đăng ký tín chỉ chính thức của Trường Đại học FPT**. Sau khi Match và thống nhất lịch, hai bên tự thực hiện thủ tục đổi lớp theo quy định của nhà trường.

---

## 1. Tài khoản, Xác thực & Phân quyền (`/login`, `/register`)

- **Đăng ký tài khoản sinh viên (`POST /api/v1/auth/register`):**
  - Nhập họ tên, mã sinh viên (tự chuẩn hóa chữ hoa), email, mật khẩu, chọn **Campus** (HN, ĐN, HCM, QN, CT) và **Ngành / Chuyên ngành** qua bộ chọn 2 cấp (`MajorSelect` — khối ngành màu cam phía trên, chuyên ngành cụ thể phía dưới).
- **Đăng nhập linh hoạt (`POST /api/v1/auth/login`):**
  - Hỗ trợ đăng nhập bằng **Email** hoặc **Mã sinh viên** (`AuthService.get_by_identifier`).
  - Lưu phiên bằng HTTP-only cookies (`access_token`, `refresh_token`) và hỗ trợ làm mới token (`POST /api/v1/auth/refresh`), đăng xuất (`POST /api/v1/auth/logout`), lấy thông tin phiên hiện tại (`GET /api/v1/auth/me`).
- **Tài khoản bị khóa (`SUSPENDED`):** Tự động từ chối đăng nhập (HTTP `403`).

---

## 2. Tự quản lý Tài khoản & Hồ sơ cá nhân (`/profile`)

Giao diện gồm thẻ tổng quan cá nhân (avatar, mã sinh viên, email, vai trò, ngày tham gia, 4 chỉ số hoạt động) và 4 tab chức năng:

1. **Hồ sơ cá nhân (`GET/PUT /api/v1/students/me`):**
   - Cập nhật họ tên, cơ sở học tập (`campus_id`), ngành & chuyên ngành (`MajorSelect`), URL ảnh đại diện (`avatar_url`) và giới thiệu ngắn (`bio`).
2. **Tài khoản & Bảo mật:**
   - **Cập nhật định danh (`PATCH /api/v1/students/me/account`):** Tự đổi Email hoặc Mã sinh viên (kiểm tra trùng lặp `409 Conflict`, khóa đổi email đối với Super Admin chính).
   - **Đổi mật khẩu (`POST /api/v1/students/me/change-password`):** Xác thực mật khẩu hiện tại, kiểm tra mật khẩu mới tối thiểu 6 ký tự và khác mật khẩu cũ.
3. **Hoạt động & Dữ liệu cá nhân:**
   - Xem thống kê tổng quan (`GET /api/v1/students/me/summary`).
   - **Tạm dừng / mở lại hàng loạt tin đăng đổi lớp** (`POST /api/v1/students/me/requests/pause-all` và `resume-all`).
   - **Sao lưu dữ liệu cá nhân (`.json`)** (`GET /api/v1/students/me/export`) gồm thông tin tài khoản, yêu cầu đổi lớp và lịch sử thông báo.
4. **Xóa tài khoản vĩnh viễn (`DELETE /api/v1/students/me`):**
   - Yêu cầu nhập mật khẩu hiện tại và gõ xác nhận `XOA TAI KHOAN`.
   - Dọn sạch toàn bộ dữ liệu liên quan (`purge_student_account`: requests, swipes, matches, conversations, messages, notifications, reports) và đăng xuất khỏi phiên. (Chặn Super Admin tự xóa).

---

## 3. Yêu cầu Đổi lớp (Gộp xem & tạo mới tại `/requests`)

- **Quản lý & Tạo mới trên cùng một trang (`/requests`):**
  - Mở form tạo trực tiếp trên `/requests` (tự mở khi chưa có yêu cầu hoặc truy cập qua `/requests?create=1`; đường dẫn cũ `/requests/new` tự động redirect sang `/requests?create=1`).
  - Tìm kiếm môn học theo mã môn hoặc tên môn trong danh mục chuẩn, tự động đồng bộ danh sách lớp mở theo môn/học kỳ/campus (`POST /api/v1/academic/classes/ensure`).
  - Chọn lớp hiện tại, lớp mong muốn, hạn yêu cầu và ghi chú.
- **Theo dõi & thao tác nhanh (`GET/POST/PUT/DELETE /api/v1/class-swap/requests/*`):**
  - Bộ lọc theo trạng thái (`Tất cả`, `Đang mở`, `Tạm ẩn`, `Đã Match`) và tìm kiếm nhanh theo môn/lớp.
  - Hỗ trợ **Tạm ẩn (`PAUSED`)**, **Mở lại (`ACTIVE`)**, **Hủy (`CANCELLED`)** và nút **Tìm đối tác** dẫn thẳng tới `/discover?course=...`.

---

## 4. Discover & Ghép đôi Hai chiều (`/discover`, `/matches`)

- **Xem toàn bộ tin đăng trong Campus (`GET /api/v1/class-swap/discover`):**
  - Mặc định hiển thị tất cả tin đăng `ACTIVE` của sinh viên khác trong cùng Campus, ưu tiên sắp xếp theo:
    1. Người đã Like bạn trước (`is_reciprocal_ready`)
    2. Tin khớp ngược chiều với yêu cầu bạn đã đăng (`is_compatible`)
    3. Các tin đăng khác trong Campus
  - Bộ lọc **Tất cả trong campus** / **Khớp yêu cầu của tôi**, tìm kiếm theo mã môn/tên môn/lớp/ngành, nút lọc nhanh theo mã môn và bộ đếm thẻ `1 / N`.
  - Hỗ trợ phím tắt trên desktop: `←` (Bỏ qua), `→` (Like), `I` (Xem chi tiết).
- **Cơ chế Mutual Like → Match (`POST /api/v1/class-swap/swipes`):**
  - Chỉ tạo **Match** khi **cả 2 bên cùng Like** (nếu bạn chưa có request ngược chiều cho tin trong campus mà nhấn **Nhận đổi & Like**, hệ thống tự tạo yêu cầu ngược chiều tương ứng nếu không bị xung đột môn đang mở).
  - Bảo vệ quyền riêng tư trên thẻ Discover (ẩn email và mã sinh viên đầy đủ trước khi Match).
- **Quản lý Matches (`/matches`, `GET /api/v1/class-swap/matches`):**
  - Bộ lọc trạng thái (`Chờ xác nhận`, `Đã xác nhận`, `Hoàn tất`) và tìm kiếm theo đối tác/môn/lớp.
  - Thanh tiến trình 3 bước: `1. Đã ghép đôi` → `2. Xác nhận 2 bên` → `3. Hoàn tất đổi lớp`.
  - Các hành động: **Xác nhận đổi** (`/confirm`), **Đánh dấu hoàn tất** (`/complete`), **Từ chối** (`/decline`) và **Mở Chat** dẫn đúng vào cuộc hội thoại (`/chat?conv=...`).

---

## 5. Chat 1-1 Realtime, Thông báo & Chuông báo (`/chat`, `/notifications`)

- **Chat 1-1 (`GET/POST /api/v1/conversations/*` & WebSocket `/api/v1/ws`):**
  - Tự động mở phòng chat khi có Match; hỗ trợ truy cập trực tiếp qua `?conv=...`.
  - Tìm kiếm hội thoại, hiển thị badge số tin chưa đọc, trạng thái kết nối realtime (`Trực tuyến` / `Đang kết nối...` via `GET /api/v1/auth/ws-ticket`).
  - Gợi ý trả lời nhanh 1 chạm phía trên khung nhập và modal **Báo cáo** chọn lý do.
- **Trung tâm Thông báo (`/notifications`, `/api/v1/notifications/*`):**
  - Phân biệt icon & màu theo loại (`MATCH`, `MESSAGE`, `SYSTEM`).
  - Lọc `Tất cả` / `Chưa đọc`, đánh dấu đã đọc từng mục hoặc **Đọc tất cả**.
- **Tiếng chuông báo (`frontend/src/lib/sound.ts`):**
  - Phát âm thanh Web Audio API khi có **tin nhắn mới** hoặc **thông báo mới** (kể cả qua WebSocket hoặc polling).
  - Có nút bật/tắt tiếng chuông trên Sidebar, Mobile Top Bar và nút **Nghe thử chuông** tại `/notifications`.

---

## 6. Trang Quản trị Super Admin (`/admin`)

- **Phân quyền tuyệt đối:**
  - Chỉ duy nhất tài khoản **`pmquan1406@gmail.com`** (`settings.ADMIN_EMAIL`) được truy cập `/admin` và gọi `/api/v1/admin/*` (`get_current_super_admin`). Mọi tài khoản khác (kể cả tài khoản có role `ADMIN` khác) đều nhận HTTP `403`, đồng thời mục **Admin** bị ẩn khỏi menu điều hướng.
- **Chức năng quản trị:**
  - **Thống kê tổng quan (`GET /api/v1/admin/overview`):** Số tài khoản (hoạt động / đang khóa), tin đăng đổi lớp, matches, tin nhắn, môn học và cơ sở.
  - **Quản lý tài khoản (`/api/v1/admin/users`):** Tìm kiếm, **thêm tài khoản mới** (`POST`), **khóa/mở khóa** (`PATCH .../status`), **đặt lại mật khẩu** (`POST .../reset-password`) và **xóa tài khoản** (`DELETE`, tự bảo vệ không xóa/khóa `pmquan1406@gmail.com`).
  - **Quản lý tin đăng đổi lớp (`/api/v1/admin/requests`):** Lọc và xóa tin đăng bất kỳ.
  - **Dữ liệu học vụ (`/api/v1/academic/*`):** Xem danh sách môn học, học kỳ, cơ sở, lớp mẫu và thêm môn học mới (`POST /api/v1/academic/courses`).
  - **Nhật ký quản trị (`GET /api/v1/admin/audit-logs`):** Theo dõi lịch sử các thao tác tạo/khóa/mở khóa/đổi mật khẩu/xóa tài khoản và xóa tin đăng.

---

## 7. Giao diện, Dark Mode & Trải nghiệm Mobile

- **Dark Mode (`ThemeToggle`, `frontend/src/lib/theme.tsx`):**
  - Nút chuyển giao diện **Sáng / Tối** trên Sidebar desktop, thanh top bar mobile, Landing page, Đăng nhập và Đăng ký; lưu cấu hình vào `localStorage`.
- **Hỗ trợ đầy đủ trên Điện thoại (`AppShell.tsx`):**
  - Thanh top bar có nút bật/tắt Dark Mode, chuông báo, thông báo, avatar `/profile`, nút **Đăng xuất** trực tiếp và **Menu (`☰`)** truy cập nhanh Hồ sơ, Thông báo, Admin (nếu có quyền), Giao diện và Đăng xuất.
  - Thanh điều hướng dưới cùng (Bottom Navigation) gồm `Trang chủ`, `Discover`, `Yêu cầu`, `Matches`, `Chat` (kèm badge tin nhắn chưa đọc).
- **Landing & Tổng quan (`/`, `/dashboard`):**
  - Trang chủ giới thiệu quy trình 4 bước và định hướng hệ sinh thái (`ClassSwap`, `StudyBuddy`, `TeamFinder`).
  - Dashboard có banner chào mừng, checklist **Bắt đầu nhanh trong 3 bước**, 4 thẻ thống kê bấm chuyển trang và danh sách Yêu cầu / Match mới nhất.
