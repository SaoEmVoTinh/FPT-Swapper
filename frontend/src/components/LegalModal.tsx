"use client";

import { useEffect } from "react";
import { FileText, ShieldCheck, X } from "lucide-react";

export type LegalDocType = "privacy" | "terms";

export function PrivacyPolicyContent() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Chính sách Bảo vệ Dữ liệu Cá nhân
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Phiên bản 2026-L91-ND356-v2 • Tuân thủ Luật Bảo vệ Dữ liệu Cá nhân 91/2025/QH15 &amp; Nghị định 356/2025/NĐ-CP
          </p>
        </div>
      </div>

      <section className="space-y-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
          1. Phạm vi, Sự đồng ý &amp; Dữ liệu thu thập
        </h3>
        <p>
          FPT Swapper chỉ thu thập dữ liệu tối thiểu để vận hành kết nối đổi lớp
          giữa sinh viên FPT (họ tên, mã số sinh viên, email, cơ sở học tập
          Campus, ngành học, lớp, yêu cầu đổi lớp, lịch sử ghép đôi Match, tin
          nhắn Chat 1-1 và nhật ký bảo mật). Việc xử lý chỉ bắt đầu khi bạn chủ
          động đánh dấu đồng ý khi đăng ký (hệ thống không tự động chọn sẵn và
          không coi sự im lặng là đồng ý).
        </p>
      </section>

      <section className="space-y-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
          2. Mục đích xử lý, An ninh mạng &amp; Minh bạch thuật toán
        </h3>
        <ul className="list-inside list-disc space-y-1">
          <li>
            <strong>Xác thực &amp; An ninh mạng (Luật 116/2025/QH15 &amp; NĐ 333/2026/NĐ-CP):</strong>{" "}
            Mật khẩu được mã hóa một chiều; phiên đăng nhập sinh viên được bảo vệ
            bằng token xoay vòng/thu hồi và giới hạn tần suất (rate-limit). Xác
            thực 2 lớp (2FA TOTP) hiện được triển khai riêng cho tài khoản Quản
            trị viên và Kiểm duyệt viên.
          </li>
          <li>
            <strong>Nhật ký bảo mật (audit logs):</strong> Hệ thống ghi nhận các
            sự kiện trọng yếu (đăng nhập thất bại, đổi mật khẩu, yêu cầu khôi
            phục/xóa tài khoản, yêu cầu đính chính danh tính và thao tác kiểm
            duyệt) nhằm phát hiện xâm nhập và chống lạm dụng; không lưu mật khẩu
            hay mã OTP trong nhật ký.
          </li>
          <li>
            <strong>Thuật toán gợi ý &amp; ghép lớp (Luật AI 134/2025/QH15 &amp; NĐ 142/2026/NĐ-CP):</strong>{" "}
            Tính năng đề xuất cặp/vòng 3 bên và chấm điểm Gợi ý thông minh hoạt
            động theo quy tắc đối chiếu môn/lớp minh bạch kèm lý do rõ ràng,
            không dùng AI tạo sinh suy đoán dữ liệu cá nhân.
          </li>
        </ul>
      </section>

      <section className="space-y-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
          3. Kiểm soát hiển thị &amp; Chia sẻ dữ liệu sau Match
        </h3>
        <ul className="list-inside list-disc space-y-1">
          <li>
            <strong>Cách ly Campus ở tầng Backend:</strong> Chỉ sinh viên cùng
            Campus mới thấy bài đăng của nhau; việc lọc Campus được thực thi trực
            tiếp trong truy vấn API máy chủ, không chỉ ẩn trên giao diện Discover.
          </li>
          <li>
            <strong>Che MSSV &amp; ngoại lệ:</strong> Trước khi Match được xác
            nhận, MSSV hiển thị tối đa 4 ký tự đầu kèm <code>****</code> và
            Email bị ẩn hoàn toàn. Ngoại lệ chỉ áp dụng cho chính chủ tài khoản,
            Quản trị viên/Kiểm duyệt viên khi xử lý vi phạm hoặc yêu cầu đính
            chính, và đối tác Match sau khi xác nhận nếu bạn chủ động cho phép.
          </li>
          <li>
            <strong>Tách lựa chọn chia sẻ Email và MSSV:</strong> Trong{" "}
            <em>Hồ sơ</em>, quyền chia sẻ Email và quyền chia sẻ MSSV sau Match
            là hai công tắc độc lập và đều <strong>mặc định tắt</strong>. Bạn
            có thể bật riêng một thông tin hoặc giữ ẩn cả hai — việc này hoàn
            toàn tùy chọn và <strong>không bắt buộc</strong> để sử dụng Chat 1-1.
          </li>
        </ul>
      </section>

      <section className="space-y-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
          4. Thời hạn lưu trữ &amp; Quy trình xóa tài khoản 14 ngày
        </h3>
        <ul className="list-inside list-disc space-y-1">
          <li>
            <strong>Hồ sơ &amp; tài khoản (14 ngày chờ xóa):</strong> Khi bạn xác
            nhận xóa tài khoản tại <em>Hồ sơ → Bảo mật</em>, tài khoản chuyển
            sang trạng thái chờ đóng và mốc 14 ngày bắt đầu tính từ thời điểm xác
            nhận. Trong 14 ngày này, bạn có thể hủy yêu cầu bất kỳ lúc nào qua
            chức năng khôi phục tài khoản tại màn hình đăng nhập. Sau 14 ngày,
            hồ sơ và token đăng nhập bị xóa vĩnh viễn.
          </li>
          <li>
            <strong>Yêu cầu đổi lớp &amp; Match:</strong> Yêu cầu quá hạn tự động
            chuyển hết hạn; khi bạn yêu cầu xóa tài khoản, các yêu cầu đang chờ
            bị hủy và toàn bộ bản ghi yêu cầu/Match được xóa khi thanh lý tài
            khoản sau 14 ngày.
          </li>
          <li>
            <strong>Tin nhắn Chat 1-1:</strong> Lưu trong thời gian tài khoản
            hoạt động để phục vụ trao đổi đổi lớp và bị xóa vĩnh viễn khi tài
            khoản hết thời hạn chờ 14 ngày.
          </li>
          <li>
            <strong>Nhật ký bảo mật &amp; bản sao lưu:</strong> Nhật ký bảo mật
            lưu tối đa 12 tháng để đảm bảo an toàn hệ thống và được gỡ liên kết
            tài khoản khi xóa vĩnh viễn. Tệp sao lưu <code>.json</code> được
            tạo theo yêu cầu để trình duyệt của bạn tải về trực tiếp, máy chủ
            không lưu thêm bản sao dự phòng riêng.
          </li>
        </ul>
      </section>

      <section className="space-y-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
          5. Quyền chủ thể dữ liệu &amp; Xử lý báo cáo vi phạm
        </h3>
        <ul className="list-inside list-disc space-y-1">
          <li>
            <strong>Quyền truy cập, chỉnh sửa &amp; đính chính:</strong> Tải dữ
            liệu <code>.json</code> tại <em>Hồ sơ → Hoạt động &amp; Dữ liệu</em>.
            Họ tên, ngành, lớp và tùy chọn chia sẻ có thể tự sửa bất kỳ lúc nào;
            riêng Email &amp; MSSV bị khóa tự sửa để bảo vệ định danh nhưng bạn
            có thể gửi <strong>Yêu cầu đính chính</strong> tại{" "}
            <em>Hồ sơ → Bảo mật</em> khi thông tin có sai sót.
          </li>
          <li>
            <strong>Quyền rút lại sự đồng ý:</strong> Bạn có thể tắt công tắc
            chia sẻ bất kỳ lúc nào hoặc yêu cầu xóa tài khoản để rút lại sự đồng
            ý trong phạm vi pháp luật cho phép.
          </li>
          <li>
            <strong>Ẩn danh hóa báo cáo vs. nghĩa vụ pháp lý:</strong> Khi tài
            khoản bị xóa vĩnh viễn, liên kết định danh trong bảng báo cáo vi phạm
            (<code>reporter_id</code>, <code>reported_student_id</code>) được gỡ
            bỏ và thay bằng mã băm ẩn danh một chiều. Phần nội dung mô tả sự
            việc và kết quả xử lý vẫn có thể được lưu tách định danh để phòng
            chống lạm dụng hoặc đáp ứng nghĩa vụ hợp pháp theo Luật An ninh mạng
            (lưu ý văn bản tự do do người dùng tự nhập có thể chứa chi tiết bạn
            tự cung cấp).
          </li>
        </ul>
      </section>
    </div>
  );
}

export function TermsOfUseContent() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400">
          <FileText className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Điều khoản Sử dụng
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Áp dụng cho toàn bộ người dùng nền tảng FPT Swapper (Cập nhật 02/11/2026)
          </p>
        </div>
      </div>

      <section className="space-y-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
          1. Bản chất nền tảng &amp; Ghi nhận đồng thuận điện tử
        </h3>
        <p>
          FPT Swapper là nền tảng hỗ trợ kết nối sinh viên <strong>phi thương mại</strong> (không thu phí, không mua bán) và{" "}
          <strong>không phải cổng đăng ký tín chỉ chính thức của Trường Đại học FPT</strong>. Theo{" "}
          <strong>Luật Giao dịch Điện tử &amp; Thương mại điện tử 122/2025/QH15 &amp; NĐ 248/2026/NĐ-CP</strong>, việc chủ động đánh dấu đồng ý khi đăng ký và xác nhận Match 2 chiều / 3 bên được lưu vết điện tử để ghi nhận sự đồng thuận kết nối; mọi thủ tục đổi lớp chính thức phải thực hiện trên FAP theo quy định nhà trường.
        </p>
      </section>

      <section className="space-y-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
          2. Trách nhiệm, An ninh mạng &amp; Quy tắc ứng xử
        </h3>
        <ul className="list-inside list-disc space-y-1">
          <li>Cung cấp thông tin môn học, lớp hiện tại và lớp mong muốn trung thực; gửi yêu cầu đính chính nếu Email hoặc MSSV đăng ký bị sai.</li>
          <li>
            Tuân thủ <strong>Luật An ninh mạng 116/2025/QH15 &amp; NĐ 333/2026/NĐ-CP</strong>: không spam tin nhắn, không sử dụng ngôn ngữ thiếu tôn trọng, không lừa đảo hoặc xâm nhập trái phép hệ thống.
          </li>
          <li>
            Tuân thủ <strong>Luật Quảng cáo 75/2025/QH15 &amp; NĐ 342/2025/NĐ-CP</strong>: nghiêm cấm lợi dụng tin đăng hoặc chat để quảng cáo thương mại, rao vặt, tiếp thị trái phép.
          </li>
          <li>
            Không tự ý bỏ hẹn sau khi đã xác nhận đổi lớp; không thu thập hoặc phát tán dữ liệu cá nhân của sinh viên khác trái phép.
          </li>
        </ul>
      </section>

      <section className="space-y-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
          3. Kiểm duyệt, Báo cáo vi phạm &amp; Xử lý
        </h3>
        <p>
          Hệ thống gợi ý điểm uy tín/lớp phù hợp áp dụng thuật toán đối chiếu minh bạch theo{" "}
          <strong>Luật Trí tuệ nhân tạo 134/2025/QH15 &amp; NĐ 142/2026/NĐ-CP</strong>. Quản trị viên có quyền cảnh cáo, ẩn tin đăng hoặc tạm khóa tài khoản nếu phát hiện hành vi vi phạm thông qua báo cáo người dùng hoặc nhật ký kiểm toán bảo mật.
        </p>
      </section>
    </div>
  );
}

export function LegalModal({
  doc,
  onClose,
  onSwitchDoc,
}: {
  doc: LegalDocType | null;
  onClose: () => void;
  onSwitchDoc: (next: LegalDocType) => void;
}) {
  useEffect(() => {
    if (!doc) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [doc, onClose]);

  if (!doc) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={
        doc === "privacy"
          ? "Chính sách Bảo vệ Dữ liệu Cá nhân"
          : "Điều khoản Sử dụng"
      }
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onSwitchDoc("privacy")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                doc === "privacy"
                  ? "bg-orange-500 text-white"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              Chính sách bảo mật
            </button>
            <button
              type="button"
              onClick={() => onSwitchDoc("terms")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                doc === "terms"
                  ? "bg-orange-500 text-white"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              Điều khoản sử dụng
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5 sm:px-6">
          {doc === "privacy" ? <PrivacyPolicyContent /> : <TermsOfUseContent />}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs dark:border-slate-800">
          <span className="text-slate-400">FPT Swapper</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-orange-500 dark:hover:bg-orange-600"
          >
            Đã hiểu &amp; Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
