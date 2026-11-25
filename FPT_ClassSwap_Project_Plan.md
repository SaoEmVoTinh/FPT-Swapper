# FPT ClassSwap

## Kế hoạch dự án và tài liệu định hướng triển khai

**Phiên bản:** 1.0\
**Loại tài liệu:** Project Plan / Product & Technical Brief\
**Đối tượng sử dụng:** Coding Agent, Product Owner, BA, UI/UX Designer,
Frontend Developer, Backend Developer, QA và các thành viên dự án.

------------------------------------------------------------------------

## 1. Tổng quan dự án

### 1.1. Tên dự án

**FPT ClassSwap** -- nền tảng kết nối sinh viên FPT để hỗ trợ đổi lớp và
mở rộng thành hệ sinh thái kết nối học tập.

### 1.2. Ý tưởng

Sinh viên thường muốn đổi sang một lớp học khác vì lịch học, giảng viên,
thời gian hoặc lý do cá nhân. Tuy nhiên, việc tìm một sinh viên khác có
nhu cầu đổi lớp ngược lại thường mất thời gian và phụ thuộc vào các nhóm
chat hoặc bài đăng thủ công.

FPT ClassSwap giải quyết vấn đề này bằng cơ chế matching tương tự
Tinder:

1.  Sinh viên tạo yêu cầu với lớp hiện tại và lớp mong muốn.
2.  Hệ thống tìm những yêu cầu có khả năng trao đổi tương thích.
3.  Sinh viên xem hồ sơ/yêu cầu và chọn Like hoặc Pass.
4.  Khi hai bên cùng Like và các điều kiện nghiệp vụ hợp lệ, hệ thống
    tạo Match.
5.  Hai bên trao đổi qua chat, xác nhận mong muốn đổi lớp và tự thực
    hiện thủ tục chính thức theo quy định của trường.

### 1.3. Định hướng sản phẩm

Không giới hạn ở chức năng đổi lớp. Sản phẩm được định hướng thành một
**Student Connection Platform** gồm ba nghiệp vụ:

-   **ClassSwap:** Tìm người đổi lớp.
-   **StudyBuddy:** Tìm bạn học cùng môn hoặc cùng mục tiêu.
-   **TeamFinder:** Tìm thành viên cho nhóm học tập/dự án.

Ba nghiệp vụ dùng chung tài khoản, hồ sơ sinh viên, hệ thống thông báo,
chat và nền tảng matching; mỗi nghiệp vụ có bộ quy tắc matching riêng.

### 1.4. Nguyên tắc quan trọng

-   Đây là nền tảng hỗ trợ kết nối, **không phải hệ thống đăng ký tín
    chỉ chính thức của FPT**.
-   Hệ thống không tự thay đổi lớp học trên hệ thống của trường.
-   Match chỉ thể hiện hai bên có sự đồng thuận ban đầu; không đồng
    nghĩa việc đổi lớp đã được nhà trường chấp thuận.
-   Dữ liệu học kỳ, môn học, lớp và lịch học được quản trị thủ công bởi
    Admin trong giai đoạn đầu.
-   Không sử dụng dữ liệu cá nhân hoặc dữ liệu học vụ từ hệ thống nội bộ
    của trường nếu chưa có quyền và sự cho phép phù hợp.

------------------------------------------------------------------------

## 2. Mục tiêu và phạm vi

### 2.1. Mục tiêu sản phẩm

1.  Giúp sinh viên tìm được người có nhu cầu đổi lớp tương thích.
2.  Giảm thời gian tìm kiếm và trao đổi thủ công.
3.  Cung cấp trải nghiệm matching trực quan, dễ sử dụng trên web.
4.  Tạo một nền tảng dùng chung để mở rộng sang StudyBuddy và
    TeamFinder.
5.  Xây dựng kiến trúc đủ rõ ràng để có thể phát triển tiếp mà không
    phải viết lại toàn bộ hệ thống.

### 2.2. Phạm vi phiên bản đầu tiên (MVP)

MVP ưu tiên hoàn thiện nghiệp vụ **ClassSwap** trước.

  -----------------------------------------------------------------------
  Nhóm chức năng                      Phạm vi MVP
  ----------------------------------- -----------------------------------
  Tài khoản                           Đăng ký, đăng nhập, đăng xuất, xác
                                      thực email hoặc mã sinh viên theo
                                      phương án được chọn

  Hồ sơ                               Họ tên, mã sinh viên, campus, ngành
                                      học, ảnh đại diện tùy chọn

  Dữ liệu học vụ                      Danh sách học kỳ, môn học, lớp,
                                      lịch học do Admin quản lý

  Yêu cầu đổi lớp                     Tạo, xem, chỉnh sửa, tạm ẩn, hủy
                                      yêu cầu

  Matching                            Tìm yêu cầu tương thích, Like,
                                      Pass, mutual Like

  Match                               Danh sách Match, trạng thái Match,
                                      xác nhận hoặc hủy kết nối

  Chat                                Nhắn tin 1-1 sau khi Match, lưu
                                      lịch sử

  Thông báo                           Thông báo khi có Match hoặc tin
                                      nhắn mới

  Admin                               Quản lý sinh viên, học kỳ, môn học,
                                      lớp và báo cáo cơ bản
  -----------------------------------------------------------------------

### 2.3. Ngoài phạm vi MVP

Các chức năng sau được thiết kế để mở rộng, nhưng không bắt buộc hoàn
thành trong bản đầu:

-   StudyBuddy đầy đủ.
-   TeamFinder và quản lý nhóm.
-   Matching theo chu trình 3 người trở lên.
-   Chat nhóm.
-   Gửi ảnh, tệp đính kèm, voice message.
-   AI/ML recommendation.
-   Tích hợp trực tiếp với hệ thống đăng ký tín chỉ của trường.
-   Ứng dụng native iOS/Android.

### 2.4. Định nghĩa thành công của MVP

MVP được xem là đạt yêu cầu khi:

-   Sinh viên có thể tạo và quản lý yêu cầu đổi lớp.
-   Hệ thống chỉ đề xuất các yêu cầu đáp ứng điều kiện nghiệp vụ.
-   Hai bên Like nhau thì tạo đúng một Match.
-   Không tạo Match nếu chỉ một bên Like hoặc bên còn lại Pass.
-   Người dùng chỉ chat được trong cuộc hội thoại mà họ là thành viên.
-   Tin nhắn được lưu trong database và tải lại được sau khi đăng nhập
    lại.
-   Admin có thể cập nhật dữ liệu học kỳ, môn học, lớp.
-   Các luồng chính hoạt động tốt trên desktop và mobile browser.

------------------------------------------------------------------------

## 3. Người dùng và vai trò

### 3.1. Student

-   Đăng ký/đăng nhập.
-   Quản lý hồ sơ.
-   Chọn campus, học kỳ, môn học và lớp hiện tại.
-   Tạo yêu cầu đổi lớp.
-   Xem các yêu cầu phù hợp.
-   Like hoặc Pass.
-   Xem Match và chat.
-   Xác nhận hoặc hủy nhu cầu đổi lớp.
-   Báo cáo người dùng hoặc nội dung không phù hợp.

### 3.2. Admin

-   Quản lý tài khoản và trạng thái người dùng.
-   Quản lý campus, học kỳ, môn học, lớp và lịch học.
-   Import dữ liệu bằng CSV nếu cần.
-   Kiểm duyệt báo cáo.
-   Xem thống kê hoạt động.
-   Đóng hoặc vô hiệu hóa yêu cầu không hợp lệ.

### 3.3. Moderator

Có thể được bổ sung khi hệ thống có nhiều người dùng:

-   Xử lý báo cáo.
-   Ẩn nội dung vi phạm.
-   Tạm khóa tài khoản theo quyền được cấp.
-   Ghi nhận lịch sử xử lý.

### 3.4. System

-   Kiểm tra dữ liệu đầu vào.
-   Chạy matching.
-   Tạo Match.
-   Tạo Conversation khi cần.
-   Gửi thông báo.
-   Ghi log các hành động quan trọng.

------------------------------------------------------------------------

## 4. Quy trình nghiệp vụ ClassSwap

### 4.1. Tạo yêu cầu đổi lớp

Sinh viên nhập:

-   Học kỳ.
-   Môn học.
-   Lớp hiện tại.
-   Lớp mong muốn.
-   Lựa chọn thay thế (nếu có).
-   Ghi chú tùy chọn.
-   Thời hạn yêu cầu.

Hệ thống kiểm tra:

1.  Lớp hiện tại và lớp mong muốn thuộc cùng môn học.
2.  Hai lớp thuộc cùng học kỳ.
3.  Hai lớp đang ở trạng thái cho phép trao đổi.
4.  Sinh viên có quyền tạo yêu cầu theo chính sách của sản phẩm.
5.  Sinh viên không có yêu cầu đang hoạt động bị trùng hoặc mâu thuẫn.
6.  Dữ liệu phải được chọn từ danh mục do Admin quản lý, không chỉ nhập
    tên lớp tự do.

Sau khi hợp lệ, yêu cầu có trạng thái `ACTIVE`.

### 4.2. Quy tắc matching hai chiều

Ví dụ:

-   Sinh viên A đang ở lớp `MKT201_01`, muốn sang `MKT201_02`.
-   Sinh viên B đang ở lớp `MKT201_02`, muốn sang `MKT201_01`.

Hai yêu cầu có thể tương thích nếu:

``` text
A.current_class = B.target_class
AND
A.target_class = B.current_class
AND
A.course = B.course
AND
A.semester = B.semester
AND
A.status = ACTIVE
AND
B.status = ACTIVE
```

Nếu hai bên cùng Like nhau, hệ thống tạo Match.

**Không tạo Match chỉ dựa trên việc hai yêu cầu tương thích.** Mutual
Like là điều kiện bắt buộc để xác nhận sự quan tâm của cả hai bên.

### 4.3. Luồng trạng thái

Yêu cầu đổi lớp:

``` text
DRAFT -> ACTIVE -> MATCHED -> COMPLETED
                   |  |
                   |  -> CANCELLED
                   -> EXPIRED

ACTIVE -> PAUSED
PAUSED -> ACTIVE
PAUSED -> CANCELLED
```

Match:

``` text
PENDING_CONFIRMATION -> CONFIRMED -> COMPLETED
          |                |
          -> DECLINED       -> CANCELLED
```

Tên trạng thái có thể được tinh chỉnh trong quá trình thiết kế database,
nhưng cần thống nhất một bộ trạng thái duy nhất giữa frontend, backend
và tài liệu API.

### 4.4. Xác nhận đổi lớp

Sau khi Match:

1.  Hai bên được mở cuộc trò chuyện.
2.  Hai bên trao đổi thông tin và thống nhất.
3.  Mỗi bên có thể chọn xác nhận hoặc từ chối tiếp tục.
4.  Nếu cả hai xác nhận, Match chuyển sang `CONFIRMED`.
5.  Hai bên tự thực hiện thủ tục đổi lớp chính thức theo quy định
    trường.
6.  Sau khi hoàn tất, hai bên có thể đánh dấu `COMPLETED`.

Giao diện phải ghi rõ: ClassSwap không thay thế thủ tục đăng ký tín chỉ
chính thức.

### 4.5. Group Matching -- chu trình nhiều người

Đây là tính năng nâng cao, không phải điều kiện phát hành MVP.

Ví dụ:

-   A: lớp 01 → lớp 02.
-   B: lớp 02 → lớp 03.
-   C: lớp 03 → lớp 01.

Ba yêu cầu tạo thành một chu trình đổi lớp hợp lệ về mặt quan hệ.

Định hướng triển khai:

-   Biểu diễn yêu cầu dưới dạng đồ thị có hướng.
-   Mỗi yêu cầu là một đỉnh.
-   Có cạnh từ yêu cầu A đến B nếu lớp A muốn chuyển sang là lớp hiện
    tại của B và các điều kiện khác hợp lệ.
-   Tìm chu trình bằng DFS hoặc thuật toán tìm cycle.
-   MVP mở rộng chỉ nên thử nghiệm chu trình 3 người trước.

Cần xác minh quy định thực tế của trường, sức chứa lớp, điều kiện học vụ
và sự đồng thuận của tất cả thành viên trước khi coi chu trình là khả
thi.

------------------------------------------------------------------------

## 5. Kiến trúc hệ thống

### 5.1. Công nghệ đề xuất

  Thành phần        Công nghệ                      Vai trò
  ----------------- ------------------------------ ---------------------------
  Frontend          Next.js + React + TypeScript   Giao diện web
  UI                Tailwind CSS                   Styling và responsive
  Backend           Python FastAPI                 REST API và WebSocket
  ORM               SQLAlchemy                     Truy cập database
  Migration         Alembic                        Quản lý thay đổi schema
  Database          PostgreSQL                     Lưu dữ liệu chính
  Realtime          WebSocket                      Chat và sự kiện realtime
  Cache/Broker      Redis (tùy chọn)               Chỉ bổ sung khi cần scale
  Testing           Pytest + frontend tests        Kiểm thử
  Deployment        Docker                         Đóng gói và triển khai
  Version control   Git + GitHub                   Quản lý mã nguồn

### 5.2. Kiểu kiến trúc

Chọn **Modular Monolith** cho giai đoạn đầu.

Một backend duy nhất nhưng chia module nghiệp vụ rõ ràng. Không tách
microservices khi chưa có nhu cầu thực tế.

Lợi ích:

-   Dễ phát triển và debug.
-   Dễ triển khai.
-   Ít chi phí vận hành.
-   Có thể tách module thành service riêng trong tương lai nếu cần.

### 5.3. Sơ đồ tổng quan

``` text
                  STUDENT / ADMIN
                        |
                   Web Browser
                        |
                 Next.js Frontend
                        |
                HTTPS / REST API
                        |
                  FastAPI Backend
       __________________|____________________
      |          |          |        |         |
    Auth      Student    Academic  ClassSwap  Matching
      |          |          |        |         |
      |          |          |        |      Match Logic
      |          |          |        |
      |          |          |      Chat API
      |          |          |        |
      |          |          |    WebSocket
      |__________|__________|________|_________|
                        |
                   SQLAlchemy
                        |
                    PostgreSQL

       Optional: Redis for cache / PubSub / multi-instance
```

### 5.4. Nguyên tắc phân module backend

``` text
backend/
  app/
    main.py
    core/
      config.py
      security.py
      dependencies.py
      exceptions.py
    database/
      session.py
      base.py
      models/
      migrations/
    modules/
      auth/
      students/
      academic/
      class_swap/
      matching/
      chat/
      notifications/
      reports/
      admin/
    common/
      enums.py
      pagination.py
      utils.py
    tests/
  alembic/
  requirements.txt
  Dockerfile
```

Mỗi module nên có các lớp hoặc thành phần tương ứng:

-   `router`: định nghĩa endpoint.
-   `schemas`: request/response validation.
-   `service`: xử lý nghiệp vụ.
-   `repository`: truy vấn database.
-   `models`: ORM models.
-   `tests`: unit/integration tests.

Không để logic matching, kiểm tra quyền hoặc xử lý trạng thái nằm rải
rác trong frontend.

------------------------------------------------------------------------

## 6. Thiết kế dữ liệu

### 6.1. Các nhóm dữ liệu

1.  **Identity:** sinh viên và hồ sơ.
2.  **Academic:** campus, học kỳ, môn học, lớp, lịch học.
3.  **Matching:** yêu cầu, lựa chọn lớp, lượt Like/Pass, Match.
4.  **Communication:** Conversation, thành viên, tin nhắn.
5.  **Operations:** thông báo, báo cáo, audit log.

### 6.2. Các bảng cốt lõi

  Bảng                           Mục đích
  ------------------------------ ------------------------------
  `students`                     Tài khoản sinh viên
  `student_profiles`             Thông tin hồ sơ
  `campuses`                     Cơ sở
  `semesters`                    Học kỳ
  `courses`                      Danh mục môn học
  `classes`                      Danh mục lớp
  `class_schedules`              Lịch học của lớp
  `student_enrollments`          Lớp sinh viên đang học
  `matching_requests`            Yêu cầu matching
  `class_exchange_preferences`   Lớp hiện tại và lớp mục tiêu
  `swipes`                       Like/Pass
  `matches`                      Kết quả matching
  `conversations`                Không gian trò chuyện
  `conversation_members`         Thành viên cuộc trò chuyện
  `messages`                     Tin nhắn
  `notifications`                Thông báo
  `reports`                      Báo cáo vi phạm
  `audit_logs`                   Nhật ký hành động quan trọng

### 6.3. Nguyên tắc thiết kế database

-   Dùng UUID làm khóa chính cho các thực thể chính.
-   Dùng foreign key để đảm bảo toàn vẹn tham chiếu.
-   Dùng enum hoặc CHECK constraint cho các trường trạng thái.
-   Có `created_at`, `updated_at` cho các bảng nghiệp vụ cần theo dõi.
-   Có index cho các cột thường xuyên lọc: `semester_id`, `course_id`,
    `current_class_id`, `target_class_id`, `status`.
-   Dùng unique constraint để ngăn dữ liệu trùng.
-   Không lưu password dạng plaintext; chỉ lưu password hash.
-   Không dùng JSONB thay cho quan hệ cốt lõi. Chỉ dùng JSONB cho dữ
    liệu linh hoạt thực sự.
-   Cần xác định chính sách xóa mềm và lưu trữ dữ liệu trước khi triển
    khai production.

### 6.4. Thiết kế chat có khả năng mở rộng

Không gắn cứng Conversation với riêng ClassSwap. StudyBuddy và
TeamFinder trong tương lai cũng có thể tạo cuộc trò chuyện.

Đề xuất:

-   `conversations`: `conversation_id`, `conversation_type`,
    `source_type`, `source_id`, `status`, `created_at`.
-   `conversation_members`: `conversation_id`, `student_id`,
    `joined_at`, `last_read_at`.
-   `messages`: `message_id`, `conversation_id`, `sender_id`,
    `client_message_id`, `content`, `message_type`, `created_at`,
    `edited_at`, `deleted_at`.

Với MVP, có thể chỉ hỗ trợ `DIRECT` conversation. Schema vẫn nên cho
phép mở rộng `GROUP`.

Ràng buộc quan trọng:

-   Chỉ thành viên cuộc trò chuyện mới được đọc/gửi tin nhắn.
-   Backend tự xác định `sender_id` từ phiên đăng nhập, không tin
    `sender_id` do frontend gửi lên.
-   Có cơ chế chống gửi trùng bằng `client_message_id` hoặc idempotency
    key.
-   PostgreSQL là nguồn dữ liệu chuẩn; WebSocket chỉ là kênh realtime.
-   Khi mất kết nối, client phải tải lại tin nhắn từ API theo
    cursor/pagination.

------------------------------------------------------------------------

## 7. Matching Engine

### 7.1. Vai trò

Matching Engine chịu trách nhiệm:

1.  Nhận yêu cầu matching.
2.  Kiểm tra dữ liệu.
3.  Lọc ứng viên hợp lệ.
4.  Tính mức độ tương thích nếu nghiệp vụ có scoring.
5.  Xếp hạng kết quả.
6.  Kiểm tra Like hai chiều.
7.  Tạo Match duy nhất khi đủ điều kiện.

Matching Engine nên là module nghiệp vụ độc lập trong backend, không
nhất thiết là một server riêng.

### 7.2. ClassSwap -- matching chính xác

MVP dùng rule-based matching, không cần machine learning.

Điều kiện tương thích:

-   Cùng môn học.
-   Cùng học kỳ.
-   Cùng campus nếu chính sách yêu cầu.
-   Lớp hiện tại của A bằng lớp mục tiêu của B.
-   Lớp mục tiêu của A bằng lớp hiện tại của B.
-   Cả hai yêu cầu đang hoạt động.
-   Không phải cùng một sinh viên.
-   Chưa có Match hợp lệ trước đó.

Pseudo-code:

``` python
def is_compatible(request_a, request_b):
    if request_a.student_id == request_b.student_id:
        return False

    if request_a.status != "ACTIVE" or request_b.status != "ACTIVE":
        return False

    if request_a.semester_id != request_b.semester_id:
        return False

    if request_a.course_id != request_b.course_id:
        return False

    return (
        request_a.current_class_id == request_b.target_class_id
        and request_a.target_class_id == request_b.current_class_id
    )
```

Nếu có nhiều lớp mục tiêu, cần mô hình hóa từng lựa chọn bằng bảng
preference có `priority`, thay vì nhồi nhiều ID vào một cột.

### 7.3. Chống Match trùng và race condition

Khi hai người Like gần như đồng thời:

-   Backend phải xử lý trong transaction.
-   Chuẩn hóa cặp request ID theo thứ tự để tạo khóa duy nhất.
-   Tạo unique constraint cho cặp request đã chuẩn hóa.
-   Nếu hai request cùng tạo Match đồng thời, chỉ một thao tác được
    thành công; thao tác còn lại đọc Match đã tồn tại.
-   Không dựa vào frontend để đảm bảo tính duy nhất.

### 7.4. StudyBuddy -- định hướng scoring

Chưa cần triển khai trong MVP. Khi mở rộng có thể tính điểm:

  Tiêu chí                  Trọng số tham khảo
  ----------------------- --------------------
  Môn học chung                            35%
  Lịch rảnh tương thích                    30%
  Mục tiêu học tập                         20%
  Hình thức học                            10%
  Campus                                    5%

Điểm số thể hiện mức độ phù hợp theo tiêu chí sản phẩm, không phải xác
suất hai người sẽ học tập hiệu quả cùng nhau.

### 7.5. TeamFinder -- định hướng scoring

  Tiêu chí                      Trọng số tham khảo
  --------------------------- --------------------
  Kỹ năng phù hợp                              40%
  Liên quan học thuật                          25%
  Thời gian có thể tham gia                    20%
  Kinh nghiệm                                  15%

Trọng số cần được kiểm chứng bằng phản hồi người dùng sau khi có dữ liệu
thực tế.

### 7.6. Lộ trình thuật toán

1.  MVP: lọc điều kiện và rule-based matching.
2.  Giai đoạn tiếp: weighted scoring cho StudyBuddy/TeamFinder.
3.  Giai đoạn có dữ liệu: phân tích hành vi Like, Pass, Match, hủy và
    hoàn tất.
4.  Chỉ cân nhắc ML khi dữ liệu đủ lớn, có nhãn đáng tin cậy và có tiêu
    chí đánh giá rõ ràng.

------------------------------------------------------------------------

## 8. Thiết kế API

API dùng prefix `/api/v1`.

### 8.1. Authentication

  Method   Endpoint           Mục đích
  -------- ------------------ ------------------------
  POST     `/auth/register`   Đăng ký
  POST     `/auth/login`      Đăng nhập
  POST     `/auth/refresh`    Làm mới token
  POST     `/auth/logout`     Đăng xuất
  GET      `/auth/me`         Lấy tài khoản hiện tại

### 8.2. Student

  Method   Endpoint                Mục đích
  -------- ----------------------- --------------------------------
  GET      `/students/me`          Lấy hồ sơ của mình
  PUT      `/students/me`          Cập nhật hồ sơ
  GET      `/students/{id}`        Xem hồ sơ công khai theo quyền
  GET      `/students/me/skills`   Lấy kỹ năng của mình

### 8.3. Academic

  Method   Endpoint                             Mục đích
  -------- ------------------------------------ ------------------
  GET      `/academic/campuses`                 Danh sách campus
  GET      `/academic/semesters`                Danh sách học kỳ
  GET      `/academic/courses`                  Danh sách môn
  GET      `/academic/classes`                  Danh sách lớp
  GET      `/academic/classes/{id}/schedules`   Lịch học lớp

Các endpoint quản trị dữ liệu academic phải yêu cầu quyền Admin.

### 8.4. ClassSwap

  Method   Endpoint                              Mục đích
  -------- ------------------------------------- ----------------------------
  POST     `/class-swap/requests`                Tạo yêu cầu
  GET      `/class-swap/requests/me`             Danh sách yêu cầu của mình
  GET      `/class-swap/requests/{id}`           Chi tiết yêu cầu
  PUT      `/class-swap/requests/{id}`           Cập nhật yêu cầu
  DELETE   `/class-swap/requests/{id}`           Hủy yêu cầu
  GET      `/class-swap/discover`                Lấy yêu cầu phù hợp
  POST     `/class-swap/swipes`                  Like/Pass
  GET      `/class-swap/matches`                 Danh sách Match
  GET      `/class-swap/matches/{id}`            Chi tiết Match
  POST     `/class-swap/matches/{id}/confirm`    Xác nhận tiếp tục
  POST     `/class-swap/matches/{id}/decline`    Từ chối
  POST     `/class-swap/matches/{id}/complete`   Đánh dấu hoàn tất

### 8.5. Chat

  --------------------------------------------------------------------------------
  Method                  Endpoint                         Mục đích
  ----------------------- -------------------------------- -----------------------
  GET                     `/conversations`                 Danh sách hội thoại

  GET                     `/conversations/{id}`            Chi tiết hội thoại

  GET                     `/conversations/{id}/messages`   Lịch sử tin nhắn

  POST                    `/conversations/{id}/messages`   Gửi tin nhắn qua REST
                                                           khi cần

  WS                      `/ws/chat/{conversation_id}`     Kết nối realtime
  --------------------------------------------------------------------------------

WebSocket cần xác thực bằng cookie bảo mật hoặc connection ticket ngắn
hạn. Tránh đưa access token dài hạn vào query string vì URL có thể xuất
hiện trong log.

### 8.6. Notifications và Reports

  Method   Endpoint                     Mục đích
  -------- ---------------------------- ---------------------
  GET      `/notifications`             Danh sách thông báo
  PATCH    `/notifications/{id}/read`   Đánh dấu đã đọc
  POST     `/reports`                   Gửi báo cáo
  GET      `/admin/reports`             Admin xem báo cáo

### 8.7. Quy ước API

-   Request/response dùng JSON.
-   Validate bằng Pydantic.
-   Có pagination cho danh sách.
-   Có filter và sort khi phù hợp.
-   Dùng HTTP status code đúng ngữ nghĩa.
-   Chuẩn hóa error response.
-   Không trả về password hash hoặc dữ liệu nhạy cảm.
-   Kiểm tra quyền ở backend trên mọi endpoint có dữ liệu riêng tư.
-   Tài liệu API được sinh và duy trì bằng OpenAPI/Swagger của FastAPI.

------------------------------------------------------------------------

## 9. Chat và realtime

### 9.1. Quy tắc mở chat

Trong MVP, chỉ mở chat khi đã có Match hợp lệ.

Conversation được tạo một lần cho Match, tránh tạo nhiều cuộc trò chuyện
trùng nhau khi người dùng tải lại trang hoặc gửi request lặp.

### 9.2. Luồng gửi tin nhắn

1.  Client kết nối WebSocket.
2.  Backend xác thực người dùng.
3.  Backend xác nhận người dùng thuộc Conversation.
4.  Backend kiểm tra Conversation/Match còn cho phép gửi tin nhắn.
5.  Backend validate nội dung.
6.  Backend lưu tin nhắn vào PostgreSQL.
7.  Backend gửi ACK cho người gửi.
8.  Backend gửi sự kiện đến người nhận nếu đang online.
9.  Nếu người nhận offline, tin nhắn vẫn được lưu và tải khi họ quay
    lại.

### 9.3. Event đề xuất

``` json
{
  "event": "SEND_MESSAGE",
  "data": {
    "conversation_id": "uuid",
    "client_message_id": "uuid",
    "content": "Bạn có muốn đổi lớp trong tuần này không?"
  }
}
```

Các event:

-   `SEND_MESSAGE`
-   `MESSAGE_ACK`
-   `MESSAGE_NEW`
-   `MESSAGE_DELIVERED`
-   `MESSAGE_READ`
-   `TYPING_START`
-   `TYPING_STOP`
-   `USER_ONLINE`
-   `USER_OFFLINE`

MVP chỉ cần gửi/nhận realtime, ACK, lưu lịch sử và tải lại tin nhắn.
Read receipt, typing và online status có thể triển khai sau.

### 9.4. Nguyên tắc tin cậy

-   Không đánh đồng việc server gửi WebSocket thành công với việc người
    nhận đã đọc tin.
-   Chỉ đánh dấu delivered khi client người nhận xác nhận đã nhận.
-   Tin nhắn trong database là nguồn dữ liệu chuẩn.
-   Khi reconnect, client đồng bộ lại bằng cursor hoặc timestamp.
-   Có rate limit và giới hạn độ dài tin nhắn.
-   Escape/render nội dung an toàn để chống XSS.

------------------------------------------------------------------------

## 10. Giao diện và trải nghiệm người dùng

### 10.1. Các màn hình chính

1.  Landing page.
2.  Register / Login.
3.  Onboarding và hồ sơ sinh viên.
4.  Dashboard.
5.  ClassSwap -- tạo yêu cầu.
6.  ClassSwap -- Discover.
7.  Match list.
8.  Chat.
9.  My Requests.
10. Notification Center.
11. Profile & Settings.
12. Admin Dashboard.

### 10.2. Discover kiểu Tinder

Mỗi thẻ yêu cầu nên hiển thị:

-   Môn học.
-   Học kỳ.
-   Lớp hiện tại.
-   Lớp mong muốn.
-   Lịch học nếu có.
-   Thông tin hồ sơ tối thiểu cần thiết.
-   Ghi chú tùy chọn.

Thao tác:

-   Like.
-   Pass.
-   Xem chi tiết.

Không hiển thị công khai các thông tin nhạy cảm như email cá nhân, số
điện thoại hoặc dữ liệu học vụ không cần thiết.

### 10.3. Match và Chat

-   Match list có trạng thái rõ ràng.
-   Chat layout gồm danh sách hội thoại và khung chat.
-   Hiển thị thông tin trao đổi lớp ở phần đầu cuộc trò chuyện.
-   Có nút xác nhận, từ chối, báo cáo hoặc chặn theo chính sách.
-   Trạng thái kết nối không được gây hiểu nhầm về việc tin nhắn đã được
    đọc.

### 10.4. Responsive

Thiết kế ưu tiên desktop nhưng phải sử dụng tốt trên mobile browser:

-   Discover dùng card phù hợp màn hình nhỏ.
-   Chat chuyển thành một màn hình hội thoại trên mobile.
-   Form nhập liệu dễ thao tác bằng cảm ứng.
-   Không phụ thuộc hover để sử dụng chức năng chính.

------------------------------------------------------------------------

## 11. Bảo mật, quyền riêng tư và kiểm soát dữ liệu

### 11.1. Authentication và Authorization

-   Password được hash bằng thuật toán phù hợp như Argon2 hoặc bcrypt.
-   Token có thời hạn và cơ chế refresh/revoke phù hợp.
-   Phân quyền Student, Moderator, Admin.
-   Backend phải kiểm tra quyền sở hữu dữ liệu, không chỉ kiểm tra người
    dùng đã đăng nhập.
-   Không cho phép sửa request hoặc hồ sơ của người khác.

### 11.2. Bảo vệ chat

-   Chỉ thành viên Conversation được truy cập.
-   Không tin `sender_id` từ client.
-   Kiểm tra trạng thái Match/Conversation trước khi gửi.
-   Rate limit gửi tin.
-   Có chức năng report/block theo lộ trình.

### 11.3. Dữ liệu cá nhân

-   Chỉ thu thập dữ liệu cần thiết cho matching.
-   Có chính sách hiển thị hồ sơ.
-   Có cơ chế đóng tài khoản và xử lý dữ liệu theo chính sách sản phẩm.
-   Không đưa dữ liệu cá nhân thật lên môi trường demo/test nếu không
    cần thiết.
-   Có audit log cho các hành động quản trị quan trọng.

### 11.4. Dữ liệu học vụ thủ công

Admin là nguồn quản lý dữ liệu danh mục:

-   Campus.
-   Học kỳ.
-   Môn học.
-   Lớp.
-   Lịch học.
-   Trạng thái lớp.

Nên hỗ trợ CSV import/export, kiểm tra dữ liệu trước khi import và ghi
nhận người thực hiện. Không tự động crawl hoặc tích hợp vào hệ thống nội
bộ khi chưa có sự cho phép.

------------------------------------------------------------------------

## 12. Kế hoạch triển khai theo giai đoạn

Kế hoạch tham khảo 12 tuần. Có thể điều chỉnh theo số lượng thành viên
và thời gian thực tế.

### Giai đoạn 1 -- Discovery & BA (Tuần 1)

**Mục tiêu:** Thống nhất vấn đề, đối tượng và quy tắc nghiệp vụ.

Công việc:

-   Xác định người dùng mục tiêu.
-   Phỏng vấn hoặc khảo sát sinh viên.
-   Xác định quy trình đổi lớp thực tế.
-   Chốt business rules.
-   Chốt phạm vi MVP.
-   Viết user stories và acceptance criteria.

**Deliverables:**

-   Product brief.
-   Business requirements.
-   User stories.
-   Danh sách business rules.
-   MVP scope được thống nhất.

### Giai đoạn 2 -- System Design (Tuần 2)

**Mục tiêu:** Chốt nền tảng kỹ thuật trước khi code.

Công việc:

-   Thiết kế kiến trúc.
-   Thiết kế ERD và schema.
-   Thiết kế API contract.
-   Thiết kế luồng matching.
-   Wireframe các màn hình chính.
-   Thiết lập repository và quy ước Git.

**Deliverables:**

-   Architecture diagram.
-   ERD.
-   API specification.
-   Wireframe.
-   Repository structure.
-   Coding conventions.

### Giai đoạn 3 -- Foundation (Tuần 3--4)

**Mục tiêu:** Có nền tảng chạy được end-to-end.

Công việc:

-   Khởi tạo Next.js.
-   Khởi tạo FastAPI.
-   Thiết lập PostgreSQL.
-   Cấu hình SQLAlchemy và Alembic.
-   Implement authentication.
-   Implement student profile.
-   Implement academic catalog và Admin CRUD.
-   Thiết lập Docker và môi trường development.

**Deliverables:**

-   Frontend/backend chạy được.
-   Database migration.
-   Đăng ký/đăng nhập.
-   Hồ sơ sinh viên.
-   Admin quản lý dữ liệu học vụ.

### Giai đoạn 4 -- ClassSwap Core (Tuần 5--6)

**Mục tiêu:** Hoàn thành luồng đổi lớp chính.

Công việc:

-   Tạo/cập nhật/hủy yêu cầu.
-   Validate lớp và học kỳ.
-   Discover candidates.
-   Implement exact reciprocal matching.
-   Implement Like/Pass.
-   Tạo Match khi mutual Like.
-   Xử lý duplicate và race condition.

**Deliverables:**

-   ClassSwap request management.
-   Matching service.
-   Swipe interface.
-   Match list.
-   Automated tests cho matching.

### Giai đoạn 5 -- Chat & Notification (Tuần 7--8)

**Mục tiêu:** Hai bên có thể trao đổi sau khi Match.

Công việc:

-   Thiết kế Conversation và Conversation members.
-   Tạo Conversation khi Match.
-   Implement REST message history.
-   Implement WebSocket send/receive.
-   Persist message.
-   Implement notification cơ bản.
-   Xử lý reconnect và đồng bộ tin nhắn.

**Deliverables:**

-   Chat 1-1 realtime.
-   Lịch sử chat.
-   Notification khi có Match/tin nhắn.
-   Kiểm thử quyền truy cập Conversation.

### Giai đoạn 6 -- Hoàn thiện sản phẩm (Tuần 9--10)

**Mục tiêu:** Hoàn thiện trải nghiệm và vận hành.

Công việc:

-   Hoàn thiện responsive UI.
-   Profile và settings.
-   Report/block cơ bản.
-   Admin dashboard và thống kê.
-   Empty states, loading states, error states.
-   Kiểm tra accessibility và usability.

**Deliverables:**

-   UI hoàn thiện.
-   Admin dashboard.
-   Báo cáo cơ bản.
-   Luồng lỗi và trạng thái rỗng được xử lý.

### Giai đoạn 7 -- QA & Release (Tuần 11--12)

**Mục tiêu:** Kiểm thử, triển khai và chạy thử với nhóm sinh viên nhỏ.

Công việc:

-   Unit tests.
-   Integration tests.
-   End-to-end tests.
-   Security checks.
-   Kiểm tra hiệu năng cơ bản.
-   Deploy staging.
-   User acceptance testing.
-   Sửa lỗi và deploy beta.

**Deliverables:**

-   Test report.
-   Staging/production deployment.
-   Hướng dẫn sử dụng.
-   Hướng dẫn Admin.
-   Release notes.
-   Danh sách backlog cho phiên bản tiếp theo.

------------------------------------------------------------------------

## 13. Phân chia công việc cho nhóm

Có thể điều chỉnh theo số lượng thành viên. Một người có thể đảm nhận
nhiều vai trò trong nhóm nhỏ.

  -----------------------------------------------------------------------
  Vai trò                             Trách nhiệm
  ----------------------------------- -----------------------------------
  Product Owner / Project Lead        Mục tiêu, phạm vi, ưu tiên, quyết
                                      định sản phẩm

  Business Analyst                    Khảo sát, nghiệp vụ, user stories,
                                      acceptance criteria

  UI/UX Designer                      User flow, wireframe, prototype,
                                      design system

  Frontend Developer                  Next.js, giao diện, state, API
                                      integration

  Backend Developer                   FastAPI, database, authentication,
                                      API

  Matching Engineer                   Matching rules, candidate
                                      filtering, cycle matching về sau

  QA Engineer                         Test plan, test cases, regression,
                                      UAT

  DevOps (có thể kiêm nhiệm)          Docker, CI/CD, deployment,
                                      monitoring
  -----------------------------------------------------------------------

### 13.1. Quy tắc phối hợp

-   Mỗi task phải có người phụ trách và tiêu chí hoàn thành.
-   API contract cần thống nhất trước khi frontend/backend phát triển
    song song.
-   Không tự ý đổi tên field, endpoint hoặc enum mà không cập nhật tài
    liệu.
-   Mọi thay đổi database phải có migration.
-   Mọi tính năng nghiệp vụ phải có test tương ứng.
-   Pull Request cần được review trước khi merge vào nhánh chính.

------------------------------------------------------------------------

## 14. Hướng dẫn dành cho Coding Agent

Phần này là chỉ dẫn triển khai trực tiếp cho AI Coding Agent hoặc lập
trình viên nhận nhiệm vụ.

### 14.1. Vai trò của Agent

Bạn là Software Engineer phụ trách triển khai FPT ClassSwap theo tài
liệu này. Hãy ưu tiên tính đúng đắn nghiệp vụ, cấu trúc rõ ràng, khả
năng kiểm thử và maintainability. Không tự ý mở rộng phạm vi khi chưa
được yêu cầu.

### 14.2. Quy tắc bắt buộc

1.  Đọc toàn bộ repository trước khi sửa code.
2.  Kiểm tra stack và cấu trúc hiện tại; không tạo lại project nếu đã có
    sẵn.
3.  Giữ frontend, backend và database schema đồng bộ.
4.  Tách router, schema, service, repository và model hợp lý.
5.  Không đặt business logic quan trọng trong frontend.
6.  Không hardcode dữ liệu học vụ vào code production.
7.  Không dùng dữ liệu giả như thể là dữ liệu thật.
8.  Mọi thay đổi schema phải có Alembic migration.
9.  Viết test cho business rules.
10. Không commit secret, API key, password hoặc file `.env`.
11. Không tự động tích hợp hệ thống nội bộ của FPT.
12. Không đánh dấu task hoàn thành nếu chưa chạy kiểm thử phù hợp.

### 14.3. Thứ tự triển khai đề xuất

**Milestone 1 -- Project foundation**

-   Kiểm tra repository.
-   Tạo cấu trúc frontend/backend.
-   Cấu hình môi trường.
-   Kết nối PostgreSQL.
-   Health check endpoint.
-   Docker Compose cho local development.

**Milestone 2 -- Authentication & Profile**

-   Student model.
-   Register/login.
-   Password hashing.
-   Authentication dependencies.
-   Current user endpoint.
-   Student profile CRUD.
-   Authorization tests.

**Milestone 3 -- Academic Catalog**

-   Campus, semester, course, class, schedule models.
-   Admin CRUD.
-   CSV import nếu được yêu cầu.
-   Public read APIs.
-   Seed data cho development.

**Milestone 4 -- ClassSwap Requests**

-   Request model.
-   Preference model.
-   Create/update/cancel.
-   Input validation.
-   Request ownership checks.
-   State transition tests.

**Milestone 5 -- Matching**

-   Candidate filtering.
-   Reciprocal compatibility.
-   Like/Pass.
-   Mutual Like.
-   Atomic Match creation.
-   Duplicate prevention.
-   Matching tests.

**Milestone 6 -- Chat**

-   Conversation model.
-   Conversation members.
-   Message model.
-   REST history.
-   WebSocket authentication.
-   Send/receive.
-   Reconnect sync.
-   Access control tests.

**Milestone 7 -- Notifications & Admin**

-   Notification model/service.
-   Match notification.
-   Message notification.
-   Report workflow.
-   Admin overview.

**Milestone 8 -- Polish & Release**

-   Responsive UI.
-   Loading/error/empty states.
-   E2E tests.
-   Docker production configuration.
-   Deployment documentation.

### 14.4. Definition of Done cho mỗi task

Một task chỉ được xem là hoàn thành khi:

-   Code đúng phạm vi yêu cầu.
-   Không làm hỏng chức năng hiện có.
-   Có validation phù hợp.
-   Có xử lý lỗi.
-   Có kiểm tra quyền nếu liên quan dữ liệu người dùng.
-   Có test phù hợp.
-   Lint/type check/build thành công trong phạm vi dự án.
-   Tài liệu được cập nhật nếu API, schema hoặc hành vi thay đổi.
-   Có mô tả file đã sửa và cách kiểm thử.

### 14.5. Cách Agent báo cáo sau mỗi milestone

Agent cần báo cáo:

1.  Đã hoàn thành những gì.
2.  Những file/thư mục quan trọng đã tạo hoặc sửa.
3.  Database migration nào đã thêm.
4.  API nào đã có.
5.  Test nào đã chạy và kết quả.
6.  Vấn đề còn tồn tại.
7.  Việc cần làm tiếp theo.

Nếu yêu cầu chưa rõ hoặc có nhiều cách hiểu ảnh hưởng đến schema/logic,
hãy hỏi trước khi triển khai. Không tự suy đoán những quy tắc nghiệp vụ
quan trọng.

------------------------------------------------------------------------

## 15. Kế hoạch kiểm thử

### 15.1. Matching tests

  Trường hợp                                 Kết quả mong đợi
  ------------------------------------------ --------------------------
  A muốn lớp của B và B muốn lớp của A       Đủ điều kiện tương thích
  A và B cùng môn nhưng không đổi chéo lớp   Không tương thích
  Khác học kỳ                                Không tương thích
  Khác môn học                               Không tương thích
  Một request đã hủy                         Không tương thích
  Một request đã hết hạn                     Không tương thích
  A Like, B chưa Like                        Chưa tạo Match
  A Like, B Pass                             Không tạo Match
  A và B cùng Like                           Tạo một Match
  Gửi Like lặp lại                           Không tạo dữ liệu trùng
  Hai request đồng thời tạo Match            Chỉ tồn tại một Match

### 15.2. Authorization tests

-   Sinh viên A không được sửa request của B.
-   Sinh viên không phải thành viên không được đọc Conversation.
-   Người ngoài không được gửi tin nhắn vào Conversation.
-   Student không được gọi API quản trị.
-   Người bị khóa không được tiếp tục thao tác theo chính sách hệ thống.

### 15.3. Chat tests

-   Tin nhắn gửi thành công được lưu database.
-   Người nhận online nhận được sự kiện realtime.
-   Người nhận offline vẫn xem được tin nhắn khi đăng nhập lại.
-   Gửi lại cùng `client_message_id` không tạo tin nhắn trùng.
-   Người dùng không thể giả mạo `sender_id`.
-   Tin nhắn không được gửi khi Conversation đã đóng.

### 15.4. UI tests

-   Form có validation.
-   Trạng thái loading/error/empty hiển thị đúng.
-   Discover không hiển thị request của chính mình.
-   Like/Pass cập nhật giao diện hợp lý.
-   Chat hoạt động trên desktop và mobile.
-   Không để lộ thông tin cá nhân không cần thiết.

------------------------------------------------------------------------

## 16. Chỉ số theo dõi sản phẩm

### 16.1. Chỉ số ClassSwap

-   Total Requests: tổng số yêu cầu.
-   Active Requests: yêu cầu đang hoạt động.
-   Candidate Availability: số ứng viên phù hợp trung bình mỗi request.
-   Like Rate: tỷ lệ lượt Like trên lượt xem.
-   Mutual Like Rate: tỷ lệ Like hai chiều.
-   Match Rate: tỷ lệ yêu cầu tạo được Match.
-   Time to Match: thời gian trung bình để tạo Match.
-   Confirmation Rate: tỷ lệ Match được hai bên xác nhận.
-   Completion Rate: tỷ lệ Match được đánh dấu hoàn tất.
-   Cancellation Rate: tỷ lệ yêu cầu/Match bị hủy.

### 16.2. Chỉ số vận hành

-   API error rate.
-   API latency.
-   WebSocket connection failure rate.
-   Message persistence failure rate.
-   Database availability.
-   Số lượng báo cáo vi phạm.

Không tối ưu theo số lượng Match đơn thuần. Chất lượng kết nối và tỷ lệ
hoàn tất mới là những chỉ số quan trọng hơn.

------------------------------------------------------------------------

## 17. Rủi ro và phương án xử lý

  -----------------------------------------------------------------------
  Rủi ro                  Tác động                Phương án
  ----------------------- ----------------------- -----------------------
  Ít người dùng ban đầu   Không đủ đối tượng để   Bắt đầu ở một campus,
                          matching                một số môn và một học
                                                  kỳ

  Dữ liệu lớp lỗi thời    Đề xuất sai             Admin cập nhật, có thời
                                                  hạn dữ liệu và trạng
                                                  thái lớp

  Sinh viên tạo yêu cầu   Giảm chất lượng hệ      Chỉ chọn từ danh mục
  không hợp lệ            thống                   lớp đã xác thực

  Match nhưng không đổi   Người dùng thất vọng    Nêu rõ disclaimer, xác
  được lớp                                        nhận thủ công, theo dõi
                                                  kết quả

  Spam hoặc tài khoản giả Ảnh hưởng niềm tin      Xác minh tài khoản,
                                                  rate limit,
                                                  report/block

  Match trùng             Trải nghiệm và dữ liệu  Transaction, unique
                          sai                     constraint, idempotency

  Lộ dữ liệu chat         Rủi ro quyền riêng tư   Authorization theo
                                                  conversation membership

  Phạm vi quá rộng        Trễ tiến độ             Ưu tiên ClassSwap MVP,
                                                  StudyBuddy/TeamFinder
                                                  sau

  Phụ thuộc tích hợp hệ   Khó triển khai          Không phụ thuộc tích
  thống trường                                    hợp trong MVP
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 18. Định hướng phát triển sau MVP

### Version 1.1

-   Tối ưu Discover.
-   Thêm lựa chọn lớp ưu tiên.
-   Cải thiện thông báo.
-   Read receipts và typing indicator.
-   Report/block hoàn chỉnh.

### Version 1.2

-   StudyBuddy.
-   Matching theo môn, lịch, mục tiêu và hình thức học.
-   Conversation 1-1 dùng chung với ClassSwap.

### Version 1.3

-   TeamFinder.
-   Tạo nhóm, vị trí cần tuyển, ứng tuyển.
-   Conversation nhóm.
-   Matching theo kỹ năng và thời gian.

### Version 2.0

-   Group ClassSwap theo chu trình nhiều người.
-   Matching scoring nâng cao.
-   Dashboard phân tích.
-   Đánh giá chất lượng matching dựa trên dữ liệu thực tế.
-   Cân nhắc ML recommendation nếu có đủ dữ liệu và cơ sở đánh giá.

------------------------------------------------------------------------

## 19. Các quyết định cần chốt trước khi phát triển

Những vấn đề dưới đây cần Product Owner/nhóm dự án xác nhận. Không nên
để Coding Agent tự quyết định vì chúng ảnh hưởng trực tiếp đến nghiệp vụ
hoặc dữ liệu.

1.  **Xác thực sinh viên:** dùng email trường, mã sinh viên, hay quy
    trình duyệt thủ công?
2.  **Phạm vi campus:** triển khai một campus trước hay cho phép nhiều
    campus ngay từ đầu?
3.  **Dữ liệu học vụ:** Admin nhập hoàn toàn thủ công hay hỗ trợ import
    CSV?
4.  **Xác minh lớp hiện tại:** sinh viên tự khai báo hay cần Admin xác
    nhận?
5.  **Lớp thay thế:** mỗi yêu cầu chỉ có một lớp mục tiêu hay hỗ trợ
    nhiều lựa chọn có thứ tự ưu tiên?
6.  **Quy tắc hủy:** khi một bên hủy sau Match, Conversation sẽ đóng hay
    chuyển sang chỉ đọc?
7.  **Thông tin hồ sơ:** trường nào được hiển thị trước Match và sau
    Match?
8.  **Quy trình hoàn tất:** ai được đánh dấu hoàn tất và có cần cả hai
    bên xác nhận không?
9.  **Chính sách dữ liệu:** thời hạn lưu yêu cầu, tin nhắn và tài khoản
    đã đóng?
10. **Triển khai:** môi trường hosting, domain, database hosting và ngân
    sách vận hành?

------------------------------------------------------------------------

## 20. Kết luận và ưu tiên thực hiện

FPT ClassSwap nên được triển khai theo hướng **ClassSwap-first,
ecosystem-ready**:

-   Xây nền tảng tài khoản, hồ sơ và dữ liệu học vụ dùng chung.
-   Hoàn thiện nghiệp vụ đổi lớp từ tạo yêu cầu đến Match và chat.
-   Thiết kế Conversation và Matching Engine đủ linh hoạt để phục vụ các
    module sau.
-   Chưa triển khai microservices hoặc machine learning ở giai đoạn đầu.
-   Chỉ mở rộng StudyBuddy, TeamFinder và Group Matching sau khi MVP
    được kiểm thử với người dùng thực tế.

**Thứ tự ưu tiên:** Nghiệp vụ đúng → dữ liệu đúng → quyền truy cập an
toàn → trải nghiệm tốt → mở rộng quy mô.

Tài liệu này là baseline để nhóm thống nhất cách hiểu sản phẩm và để
Coding Agent triển khai theo từng milestone. Mọi thay đổi lớn về phạm
vi, business rules, schema hoặc API cần được cập nhật lại trong tài liệu
và thông báo cho các thành viên liên quan.
