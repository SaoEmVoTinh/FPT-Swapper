# FPT ClassSwap — Tổng hợp Tính năng Hệ thống & Lộ trình

> **Lưu ý:** FPT ClassSwap là nền tảng hỗ trợ kết nối sinh viên tìm người đổi lớp tương thích hai chiều, **không phải hệ thống đăng ký tín chỉ chính thức của Trường Đại học FPT**. Sau khi Match và thống nhất lịch, hai bên tự thực hiện thủ tục đổi lớp theo quy định của nhà trường.

---

## 1. Tài khoản, Xác thực & Bảo mật (`/login`, `/register`)

- **Đăng ký tài khoản sinh viên (`POST /api/v1/auth/register`):**
  - Nhập họ tên, mã sinh viên (tự chuẩn hóa chữ hoa), email, mật khẩu (**tối thiểu 8 ký tự**), chọn **Campus** (HN, ĐN, HCM, QN, CT) và **Ngành / Chuyên ngành** qua bộ chọn 2 cấp (`MajorSelect` — khối ngành màu cam phía trên, chuyên ngành cụ thể phía dưới).
- **Đăng nhập linh hoạt & chống Brute-force (`POST /api/v1/auth/login`):**
  - Hỗ trợ đăng nhập bằng **Email** hoặc **Mã sinh viên** (`AuthService.get_by_identifier`).
  - **Rate limit & khóa tạm:** Giới hạn tần suất đăng nhập theo IP/tài khoản (HTTP `429`), và tự động **khóa tạm 15 phút** sau **5 lần** nhập sai mật khẩu liên tiếp.
  - **2FA (TOTP RFC 6238) cho tài khoản quản trị:** Hỗ trợ thiết lập, bật/tắt xác thực 2 lớp (`/api/v1/auth/2fa/*`); khi bật 2FA, bước đăng nhập yêu cầu mã OTP 6 chữ số (`X-2FA-Required: true`).
- **Quản lý phiên, xoay vòng & thu hồi Refresh Token:**
  - Lưu phiên bằng HTTP-only cookies (`access_token`, `refresh_token`) gắn `token_version` và `jti`.
  - **Refresh Token Rotation (`POST /api/v1/auth/refresh`):** Mỗi lần làm mới token sẽ thu hồi token cũ và cấp cặp token mới; phát hiện tái sử dụng token cũ sẽ thu hồi toàn bộ phiên của tài khoản.
  - **Thu hồi tức thì:** Khi **đăng xuất** (`POST /api/v1/auth/logout`), **đổi mật khẩu** hoặc **đặt lại mật khẩu**, toàn bộ `refresh_token` đang hoạt động và `access_token` cũ bị vô hiệu hóa (`token_version` tăng).
- **Khôi phục tài khoản đang chờ xóa (`POST /api/v1/auth/restore-account`):** Cho phép sinh viên tự khôi phục trong thời gian chờ 14 ngày.

---

## 2. Tự quản lý Tài khoản & Hồ sơ cá nhân (`/profile`)

Giao diện gồm thẻ tổng quan cá nhân (avatar, mã sinh viên, email, vai trò, ngày tham gia, 4 chỉ số hoạt động) và 4 tab chức năng:

1. **Hồ sơ cá nhân (`GET/PUT /api/v1/students/me`):**
   - Cập nhật họ tên, cơ sở học tập (`campus_id`), ngành & chuyên ngành (`MajorSelect`), URL ảnh đại diện (`avatar_url`) và giới thiệu ngắn (`bio`).
2. **Tài khoản & Bảo mật:**
   - **Cập nhật định danh (`PATCH /api/v1/students/me/account`):** Tự đổi Email hoặc Mã sinh viên (kiểm tra trùng lặp `409 Conflict`, bảo vệ email của Super Admin cuối cùng).
   - **Đổi mật khẩu (`POST /api/v1/students/me/change-password`):** Xác thực mật khẩu hiện tại, mật khẩu mới tối thiểu **8 ký tự**, khác mật khẩu cũ, và tự động thu hồi toàn bộ refresh token cũ.
3. **Hoạt động & Dữ liệu cá nhân:**
   - Xem thống kê tổng quan (`GET /api/v1/students/me/summary`).
   - **Tạm dừng / mở lại hàng loạt tin đăng đổi lớp** (`POST /api/v1/students/me/requests/pause-all` và `resume-all`).
   - **Sao lưu dữ liệu cá nhân (`.json`)** (`GET /api/v1/students/me/export`) gồm thông tin tài khoản, yêu cầu đổi lớp và lịch sử thông báo.
4. **Xóa tài khoản với thời gian chờ 14 ngày (`DELETE /api/v1/students/me`):**
   - Yêu cầu nhập mật khẩu hiện tại và gõ xác nhận `XOA TAI KHOAN`.
   - Đưa tài khoản sang trạng thái chờ xóa (`CLOSED`, `scheduled_purge_at = +14 ngày`) để có thể khôi phục; đồng thời **hủy các Match đang chờ/đã xác nhận, mở lại request của đối tác về `ACTIVE`, gửi thông báo cho đối tác**, ẩn các tin đăng của mình và thu hồi toàn bộ token.
   - Khi xóa vĩnh viễn (hard purge), các bản ghi `reports` liên quan được **ẩn danh hóa (`anonymized_*_ref`)** thay vì xóa cứng để bảo toàn bằng chứng vi phạm.

---

## 3. Yêu cầu Đổi lớp (Gộp xem & tạo mới tại `/requests`)

- **Quản lý & Tạo mới trên cùng một trang (`/requests`):**
  - Mở form tạo trực tiếp trên `/requests` (tự mở khi chưa có yêu cầu hoặc truy cập qua `/requests?create=1`; đường dẫn cũ `/requests/new` tự động redirect sang `/requests?create=1`).
  - Tìm kiếm môn học theo mã môn hoặc tên môn trong danh mục chuẩn, tự động đồng bộ danh sách lớp mở theo môn/học kỳ/campus (`POST /api/v1/academic/classes/ensure`).
  - Chọn lớp hiện tại, lớp mong muốn, hạn yêu cầu và ghi chú.
- **Theo dõi, tự động hết hạn & thao tác nhanh (`GET/POST/PUT/DELETE /api/v1/class-swap/requests/*`):**
  - Bộ lọc theo trạng thái (`Tất cả`, `Đang mở`, `Tạm ẩn`, `Đã Match`) và tìm kiếm nhanh theo môn/lớp.
  - Tự động chuyển các yêu cầu quá `expires_at` sang trạng thái **`EXPIRED`** và ẩn khỏi Discover.
  - Hỗ trợ **Tạm ẩn (`PAUSED`)**, **Mở lại (`ACTIVE`)**, **Hủy (`CANCELLED`)** và nút **Tìm đối tác** dẫn thẳng tới `/discover?course=...`.

---

## 4. Discover & Ghép đôi Hai chiều (`/discover`, `/matches`)

- **Xem toàn bộ tin đăng trong Campus (`GET /api/v1/class-swap/discover`):**
  - Mặc định hiển thị các tin đăng `ACTIVE` chưa quá hạn của sinh viên khác trong cùng Campus, ưu tiên sắp xếp theo:
    1. Người đã Like bạn trước (`is_reciprocal_ready`)
    2. Tin khớp ngược chiều với yêu cầu bạn đã đăng (`is_compatible`)
    3. Các tin đăng khác trong Campus
  - Bộ lọc **Tất cả trong campus** / **Khớp yêu cầu của tôi**, tìm kiếm theo mã môn/tên môn/lớp/ngành, nút lọc nhanh theo mã môn và bộ đếm thẻ `1 / N`.
  - Hỗ trợ phím tắt trên desktop: `←` (Bỏ qua), `→` (Like), `I` (Xem chi tiết).
- **Cơ chế Mutual Like → Match (`POST /api/v1/class-swap/swipes`):**
  - Chỉ tạo **Match** khi **cả 2 bên cùng Like** (nếu bạn chưa có request ngược chiều cho tin trong campus mà nhấn **Nhận đổi & Like**, hệ thống tự tạo yêu cầu ngược chiều tương ứng nếu không bị xung đột môn đang mở).
  - Mỗi Match mới được gắn **hạn xác nhận 48 giờ** (`confirm_deadline_at`); quá 48 giờ chưa đủ 2 bên xác nhận sẽ tự động chuyển sang **`EXPIRED`** và gửi thông báo cho cả hai.
  - Bảo vệ quyền riêng tư trên thẻ Discover (ẩn email và mã sinh viên đầy đủ trước khi Match).
- **Quản lý Matches, Xử lý Xung đột & Luồng Hủy Match (`/matches`, `GET /api/v1/class-swap/matches`):**
  - Bộ lọc trạng thái (`Chờ xác nhận`, `Đã xác nhận`, `Hoàn tất`) và tìm kiếm theo đối tác/môn/lớp.
  - Thanh tiến trình 3 bước: `1. Đã ghép đôi` → `2. Xác nhận 2 bên` → `3. Hoàn tất đổi lớp`.
  - **Chống xung đột khi xác nhận (`POST .../confirm`):** Khi cả 2 bên xác nhận và Match chuyển sang `CONFIRMED`, 2 yêu cầu của cặp đó chuyển sang `MATCHED`, đồng thời hệ thống **tự động hủy (`CANCELLED`) toàn bộ các Match `PENDING_CONFIRMATION` khác** gắn với 2 yêu cầu này và gửi thông báo cho các đối tác đang chờ.
  - **Luồng từ chối / hủy Match (`POST .../decline`):** Cho phép một bên từ chối ở trạng thái `PENDING_CONFIRMATION` **hoặc hủy sau khi đã `CONFIRMED`**; khi hủy một Match đã `CONFIRMED`, hệ thống chuyển Match sang `DECLINED`, **mở lại hai yêu cầu `MATCHED` về `ACTIVE`** để cả hai tiếp tục tìm đối tác khác và thông báo cho đối tác.
  - **Hoàn tất (`POST .../complete`):** Chuyển Match và 2 yêu cầu sang `COMPLETED`.

---

## 5. Chat 1-1 Realtime, Thông báo & Chuông báo (`/chat`, `/notifications`)

- **Chat 1-1 & Cơ chế dự phòng mất kết nối (`GET/POST /api/v1/conversations/*` & WebSocket `/api/v1/ws`):**
  - Tự động mở phòng chat khi có Match; hỗ trợ truy cập trực tiếp qua `?conv=...`.
  - Kết nối realtime qua WebSocket (`/api/v1/ws` sử dụng cookie hoặc `GET /api/v1/auth/ws-ticket`) với tự động reconnect khi đứt kết nối.
  - **Cơ chế dự phòng (Fallback Polling):** Khi WebSocket không khả dụng (ví dụ hạ tầng serverless hoặc mất kết nối tạm thời), client tự động đồng bộ lại workspace (`refreshWorkspace`) theo chu kỳ **20 giây** khi tab trình duyệt đang mở (`document.visibilityState === "visible"`), đảm bảo tin nhắn và thông báo mới vẫn được cập nhật và phát chuông báo.
  - Tìm kiếm hội thoại, hiển thị badge số tin chưa đọc, gợi ý trả lời nhanh 1 chạm và modal **Báo cáo** chọn lý do.
- **Trung tâm Thông báo (`/notifications`, `/api/v1/notifications/*`):**
  - Phân biệt icon & màu theo loại (`MATCH`, `MESSAGE`, `SYSTEM`).
  - Lọc `Tất cả` / `Chưa đọc`, đánh dấu đã đọc từng mục hoặc **Đọc tất cả**.
- **Tiếng chuông báo (`frontend/src/lib/sound.ts`):**
  - Phát âm thanh Web Audio API khi có tin nhắn mới hoặc thông báo mới; có nút bật/tắt trên Sidebar, Mobile Top Bar và nút **Nghe thử chuông** tại `/notifications`.

---

## 6. Trang Quản trị RBAC & 2FA (`/admin`)

- **Phân quyền theo vai trò RBAC (`SUPER_ADMIN`, `ADMIN`, `MODERATOR`):**
  - Hỗ trợ nhiều tài khoản quản trị; `SUPER_ADMIN` có toàn quyền (phân quyền `PATCH /api/v1/admin/users/{id}/role`, xóa tài khoản, dọn tài khoản hết hạn chờ xóa `POST /api/v1/admin/users/purge-expired`); `ADMIN` tạo tài khoản và đặt lại mật khẩu; `MODERATOR` xem thống kê, khóa/mở khóa tài khoản sinh viên, xử lý tin đăng và xem nhật ký.
  - Tự động bảo vệ `SUPER_ADMIN` cuối cùng không thể bị xóa, khóa hoặc hạ quyền; ẩn mục **Admin** khỏi menu với các tài khoản `STUDENT`.
  - Hỗ trợ thiết lập **2FA (TOTP)** cho tài khoản quản trị ngay trong `/admin`.
- **Chức năng quản trị & Lưu trữ Audit Logs:**
  - **Thống kê tổng quan (`GET /api/v1/admin/overview`):** Số tài khoản (hoạt động / đang khóa), tin đăng đổi lớp, matches, tin nhắn, môn học và cơ sở.
  - **Quản lý tài khoản (`/api/v1/admin/users`):** Tìm kiếm, thêm mới (`POST`), phân quyền (`PATCH .../role`), khóa/mở khóa (`PATCH .../status`), đặt lại mật khẩu (`POST .../reset-password`, thu hồi toàn bộ refresh token) và xóa tài khoản (`DELETE`, tự bảo vệ dữ liệu báo cáo vi phạm bằng ẩn danh hóa).
  - **Quản lý tin đăng đổi lớp (`/api/v1/admin/requests`):** Lọc và xóa tin đăng bất kỳ.
  - **Dữ liệu học vụ (`/api/v1/academic/*`):** Xem danh sách môn học, học kỳ, cơ sở, lớp mẫu và thêm môn học mới.
  - **Nhật ký quản trị (`GET /api/v1/admin/audit-logs`):** Lưu bền vững mọi thao tác quan trọng (đăng nhập/khóa tạm, 2FA, đổi mật khẩu, tự xóa/khôi phục, tạo/khóa/xóa/phân quyền user, xóa tin đăng) trong bảng `audit_logs`; API truy vấn mặc định 50 bản ghi mới nhất (tối đa 200/lần gọi), khuyến nghị lưu trữ tối thiểu **90 ngày** trên DB trước khi lưu trữ lạnh (archive).

---

## 7. Giao diện, Dark Mode & Trải nghiệm Mobile

- **Dark Mode (`ThemeToggle`, `frontend/src/lib/theme.tsx`):**
  - Chuyển giao diện **Sáng / Tối** đồng bộ toàn bộ các trang, form, select, badge và modal; lưu cấu hình vào `localStorage`.
- **Hỗ trợ đầy đủ trên Điện thoại (`AppShell.tsx`):**
  - Thanh top bar có nút bật/tắt Dark Mode, chuông báo, thông báo, avatar `/profile`, nút **Đăng xuất** trực tiếp và **Menu (`☰`)** truy cập nhanh Hồ sơ, Thông báo, Admin (khi có quyền), Giao diện và Đăng xuất.
  - Thanh điều hướng dưới cùng gồm `Trang chủ`, `Discover`, `Yêu cầu`, `Matches`, `Chat` (kèm badge tin chưa đọc).

---

## 8. Lộ trình Nâng cấp Tiếp theo

### Đã hoàn thành (P0)
- Mật khẩu tối thiểu 8 ký tự, rate limit & khóa tạm sau 5 lần đăng nhập sai, xoay vòng & thu hồi `refresh_token`.
- RBAC (`SUPER_ADMIN`, `ADMIN`, `MODERATOR`), hỗ trợ nhiều admin và 2FA (TOTP) cho admin.
- Tự động hủy Match chờ xung đột khi đã xác nhận, hết hạn xác nhận Match 48h (`EXPIRED`), tự chuyển request quá hạn sang `EXPIRED` & ẩn khỏi Discover.
- Soft-delete 14 ngày kèm khôi phục tài khoản, thông báo đối tác & mở lại request khi xóa tài khoản đang có Match, và ẩn danh hóa bảng `reports` thay vì xóa cứng bằng chứng.

### Kế hoạch P1 (Tăng giá trị cốt lõi)
- Hiển thị chi tiết lịch học (thứ/ca/phòng/giảng viên), phát hiện trùng lịch với các môn khác của bạn và xem TKB tuần.
- Đổi lớp vòng 3 bên (`A → B → C → A`) bằng thuật toán tìm chu trình trên đồ thị yêu cầu.
- Hàng đợi xử lý báo cáo vi phạm (`reports`) ngay trên trang Admin (duyệt, cảnh cáo/khóa, ghi lý do, thông báo cho người báo cáo).
- Chặn người dùng (`Block`) trong Discover/Chat và Hoàn tác swipe (`Undo`).
- Đánh giá uy tín sau khi hoàn tất đổi lớp và ghi nhận bỏ hẹn (`no-show`).
- Checklist hướng dẫn thủ tục đổi lớp theo từng Campus ngay trên trang Match.
- Thông báo ngoài app (Email / Web Push) khi có Like/Match/tin nhắn và nhắc trước khi request hết hạn.
- Tùy chọn ẩn/hiện thông tin liên hệ sau khi Match.

### Kế hoạch P2 (Trải nghiệm & Vận hành)
- Gợi ý thông minh & heatmap nhu cầu theo lớp/môn.
- Chat: gửi ảnh TKB, trạng thái đã đọc / đang gõ, rate-limit chống spam tin nhắn.
- Admin: biểu đồ theo thời gian, xuất CSV, thao tác hàng loạt, sửa/xóa môn học, import lớp từ file Excel TKB mỗi kỳ, gửi thông báo toàn hệ thống.
- PWA cài lên màn hình điện thoại, đa ngôn ngữ Việt/Anh, tăng cường accessibility (`a11y`).
- Trang Chính sách quyền riêng tư & Điều khoản sử dụng phù hợp Nghị định 13/2023/NĐ-CP kèm xác nhận đồng ý khi đăng ký.
