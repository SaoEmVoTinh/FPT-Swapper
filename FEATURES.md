# FPT Swapper — Tổng hợp Tính năng Hệ thống & Lộ trình

> **Lưu ý:** FPT Swapper là nền tảng hỗ trợ kết nối sinh viên tìm người đổi lớp tương thích hai chiều, **không phải hệ thống đăng ký tín chỉ chính thức của Trường Đại học FPT**. Sau khi Match và thống nhất lịch, hai bên tự thực hiện thủ tục đổi lớp theo quy định của nhà trường.

---

## 1. Tài khoản, Xác thực & Bảo mật (`/login`, `/register`)

- **Đăng ký tài khoản sinh viên (`POST /api/v1/auth/register`):**
  - Nhập họ tên, mã sinh viên (tự chuẩn hóa chữ hoa), email, mật khẩu (**tối thiểu 8 ký tự**), chọn **Campus** (HN, ĐN, HCM, QN, CT), **Ngành / Chuyên ngành** (`MajorSelect`) và **Lớp** (VD: `AI21A01`, `SE1801`), kèm bước xem lại & xác nhận thông tin trước khi gửi.
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
   - **Định danh cố định:** Email và Mã sinh viên được khóa cố định sau bước xác nhận thông tin khi đăng ký, không thể tự thay đổi.
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
  - Tìm kiếm môn học theo mã môn hoặc tên môn trong danh mục chuẩn, tự động đồng bộ danh sách lớp mở theo môn/học kỳ/campus (`POST /api/v1/academic/classes/ensure`, hiển thị dạng `MÃ_MÔN - TÊN_LỚP`, không gắn mã cơ sở `HN`/`DN` vào tên lớp).
  - Tự động gắn cơ sở (`campus_id`) của tài khoản để đảm bảo chỉ sinh viên trong cùng campus mới thấy bài đăng của nhau; cho phép nhập hoặc chọn nhanh tên lớp hiện tại/mong muốn (VD: `MAI391 - AI21A01`) và không yêu cầu phòng học hay giảng viên (web trường FAP sẽ hiển thị TKB chi tiết sau khi đổi thành công).
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
- RBAC (`SUPER_ADMIN`, `ADMIN`, `MODERATOR`), hỗ trợ nhiều admin và 2FA (TOTP) cho admin (tùy chọn bật/tắt).
- Tự động hủy Match chờ xung đột khi đã xác nhận, hết hạn xác nhận Match 48h (`EXPIRED`), tự chuyển request quá hạn sang `EXPIRED` & ẩn khỏi Discover.
- Soft-delete 14 ngày kèm khôi phục tài khoản, thông báo đối tác & mở lại request khi xóa tài khoản đang có Match, và ẩn danh hóa bảng `reports` thay vì xóa cứng bằng chứng.

### Đã hoàn thành (P1 — Giá trị cốt lõi)
- **Lịch học, phát hiện trùng lịch & TKB tuần (`/requests`, `/discover`, `/matches`):** Hiển thị chi tiết thứ/ca/phòng/giảng viên, tự động cảnh báo trùng lịch giữa lớp muốn đổi sang với các môn/lớp hiện có của bạn, và xem thời khóa biểu tuần tại `GET /api/v1/class-swap/timetable`.
- **Đổi lớp vòng 3 bên (`A → B → C → A`):** Thuật toán tìm chu trình 3 sinh viên cùng môn/học kỳ/cơ sở (`GET /api/v1/class-swap/cycles`), đồng ý/từ chối tham gia (`POST /api/v1/class-swap/cycles/accept`, `decline`), tự động chuyển cả 3 request sang `MATCHED` và mở nhóm chat 3 người khi đủ 3 bên xác nhận.
- **Báo cáo vi phạm & Hàng đợi xử lý Admin (`POST /api/v1/reports`, `/admin`):** Modal báo cáo từ Chat gửi thật lên backend; trang Admin có tab **Báo cáo** với lọc trạng thái, ghi chú xử lý, thao tác Cảnh cáo / Khóa tài khoản / Bỏ qua, đồng thời thông báo kết quả cho người báo cáo và ghi `audit_logs`.
- **Chặn người dùng (Block) & Hoàn tác swipe (Undo):** Chặn/bỏ chặn (`GET/POST/DELETE /api/v1/students/me/blocks/*`) từ Chat, Discover và Hồ sơ (ẩn khỏi Discover, chặn gửi tin nhắn `403`, chặn tương tác); nút **Hoàn tác (`POST /api/v1/class-swap/swipes/undo`)** thu hồi lượt vuốt gần nhất và hủy Match chờ chưa xác nhận.
- **Đánh giá uy tín & Báo bỏ hẹn (No-show):** `POST /api/v1/class-swap/matches/{id}/review` chấm 1–5 sao, đánh dấu `SUCCESS` hoặc `NO_SHOW`, tự động cập nhật `trust_score`, `completed_swaps_count`, `no_show_count` hiển thị trên Discover, Matches và Hồ sơ.
- **Checklist thủ tục đổi lớp theo Campus:** Hướng dẫn từng bước và nơi nộp đơn cho 5 cơ sở (HN, ĐN, HCM, QN, CT) ngay trên `/matches`.
- **Quyền riêng tư liên hệ sau Match & Nhắc sắp hết hạn:** Tùy chọn `share_contact_after_match` trên `/profile` (chỉ hiển thị Email & MSSV đầy đủ cho đối tác khi hai bên đã `CONFIRMED`/`COMPLETED` và người đó cho phép), kèm thông báo nhắc tự động khi request sắp hết hạn trong vòng 48 giờ.

### Đã hoàn thành (P2 — Trải nghiệm & Vận hành)
- **Thông báo ngoài app (`GET/PUT /api/v1/notifications/preferences`, `POST /api/v1/notifications/push-subscriptions`):** Cấu hình bật/tắt Email SMTP và Web Push, cấp quyền thông báo trình duyệt, kèm Service Worker (`/sw.js`) và thông báo khi có Like/Match/tin nhắn mới.
- **Gợi ý thông minh & Heatmap nhu cầu (`/discover`, `GET /api/v1/class-swap/insights`):** Chấm điểm độ phù hợp 0–100% kèm lý do (đã Like trước, khớp 2 chiều, không trùng TKB, uy tín) và biểu đồ nhiệt lớp hot (số người muốn vào / muốn ra).
- **Chat nâng cao (`/chat`):** Gửi ảnh thời khóa biểu (`POST /api/v1/conversations/{id}/attachments` + lightbox phóng to), trạng thái đã xem (`POST .../read`), chỉ báo đang gõ realtime (`chat.typing` qua WebSocket), và rate-limit chống spam (20 tin/30 giây).
- **Quản trị nâng cao (`/admin`):** Biểu đồ xu hướng 14 ngày (`/api/v1/admin/analytics`), xuất CSV (`users`, `requests`, `reports`, `audit_logs`), thao tác hàng loạt khóa/mở khóa/xóa tin, sửa/xóa môn học, import lịch lớp từ Excel `.xlsx` / `.csv` (`POST /api/v1/admin/academic/import-timetable`), và phát thông báo toàn hệ thống (`POST /api/v1/admin/broadcast`).
- **PWA, Đa ngôn ngữ & Accessibility (`a11y`):** Manifest (`/manifest.webmanifest`) + Service Worker cài đặt lên màn hình chính, chuyển đổi ngôn ngữ **Tiếng Việt / English** (`VI / EN`), skip-link bàn phím, focus-visible và `aria-modal`/`aria-label`.
- **Pháp lý & Nghị định 13/2023/NĐ-CP (`/privacy`, `/terms`, `/register`):** Trang Chính sách Bảo vệ Dữ liệu Cá nhân & Điều khoản sử dụng, bắt buộc xác nhận đồng ý khi đăng ký và lưu dấu thời gian/phiên bản đồng ý (`consent_accepted_at`, `consent_version`).
