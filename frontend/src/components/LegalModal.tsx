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
            Phiên bản 2026-L91-ND356-v1 • Tuân thủ Luật Bảo vệ Dữ liệu Cá nhân 91/2025/QH15 &amp; Nghị định 356/2025/NĐ-CP
          </p>
        </div>
      </div>

      <section className="space-y-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
          1. Phạm vi &amp; Dữ liệu cá nhân được thu thập
        </h3>
        <p>
          FPT Swapper chỉ thu thập dữ liệu tối thiểu để vận hành tính năng kết nối
          đổi lớp giữa sinh viên FPT, bao gồm: họ tên, mã số sinh viên, địa chỉ
          email, cơ sở học tập (Campus), ngành học, lớp, thông tin yêu cầu đổi lớp,
          lịch sử ghép đôi (Match), tin nhắn trao đổi 1-1 và nhật ký bảo mật tài khoản.
        </p>
      </section>

      <section className="space-y-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
          2. Mục đích xử lý, An ninh mạng &amp; Minh bạch thuật toán
        </h3>
        <ul className="list-inside list-disc space-y-1">
          <li>
            <strong>Xác thực &amp; An ninh mạng (Luật 116/2025/QH15 &amp; NĐ 333/2026/NĐ-CP):</strong>{" "}
            Bảo vệ tài khoản bằng mã hóa mật khẩu, xác thực 2 lớp (2FA TOTP), giới hạn tần suất (rate-limit), xoay vòng/thu hồi token và nhật ký kiểm toán bảo mật.
          </li>
          <li>
            <strong>Thuật toán gợi ý &amp; ghép lớp (Luật AI 134/2025/QH15 &amp; NĐ 142/2026/NĐ-CP):</strong>{" "}
            Tính năng đề xuất cặp/vòng 3 bên và chấm điểm Gợi ý thông minh hoạt động theo quy tắc đối chiếu lịch học minh bạch kèm lý do rõ ràng, không dùng AI tạo sinh suy đoán dữ liệu cá nhân.
          </li>
          <li>
            <strong>Kết nối &amp; An toàn cộng đồng:</strong> Hỗ trợ nhắn tin 1-1 sau Match, gửi thông báo liên quan đến đổi lớp và xử lý báo cáo vi phạm / chặn người dùng.
          </li>
        </ul>
      </section>

      <section className="space-y-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
          3. Kiểm soát hiển thị &amp; Bảo vệ quyền riêng tư
        </h3>
        <p>
          Chỉ sinh viên cùng Campus mới thấy bài đăng của nhau. Trên trang Discover, mã số sinh viên được che một phần và email được ẩn hoàn toàn trước khi Match. Sau khi Match được xác nhận, email và MSSV đầy đủ chỉ hiển thị nếu bạn chủ động bật tùy chọn{" "}
          <strong>Chia sẻ Email &amp; MSSV sau khi Match</strong> trong Hồ sơ.
        </p>
      </section>

      <section className="space-y-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
          4. Quyền của chủ thể dữ liệu (Luật 91/2025/QH15 &amp; NĐ 356/2025/NĐ-CP)
        </h3>
        <ul className="list-inside list-disc space-y-1">
          <li>
            <strong>Quyền truy cập &amp; sao lưu:</strong> Tải toàn bộ dữ liệu cá nhân
            định dạng <code>.json</code> tại <em>Hồ sơ → Hoạt động &amp; Dữ liệu</em>.
          </li>
          <li>
            <strong>Quyền chỉnh sửa:</strong> Tự cập nhật hồ sơ, lớp học hoặc tùy chọn
            thông báo bất kỳ lúc nào (Email &amp; MSSV được khóa cố định sau khi xác nhận đăng ký).
          </li>
          <li>
            <strong>Quyền rút lại sự đồng ý &amp; xóa dữ liệu:</strong> Yêu cầu xóa tài
            khoản tại <em>Hồ sơ → Tài khoản</em> (thời gian chờ khôi phục 14 ngày
            trước khi xóa vĩnh viễn; các báo cáo vi phạm liên quan được ẩn danh hóa).
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
          <strong>Luật Giao dịch Điện tử &amp; Thương mại điện tử 122/2025/QH15 &amp; NĐ 248/2026/NĐ-CP</strong>, việc đồng ý điều khoản khi đăng ký và xác nhận Match 2 chiều / 3 bên được lưu vết điện tử để ghi nhận sự đồng thuận kết nối; mọi thủ tục đổi lớp chính thức phải thực hiện trên FAP theo quy định nhà trường.
        </p>
      </section>

      <section className="space-y-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
          2. Trách nhiệm, An ninh mạng &amp; Quy tắc ứng xử
        </h3>
        <ul className="list-inside list-disc space-y-1">
          <li>Cung cấp thông tin môn học, lớp hiện tại và lớp mong muốn trung thực.</li>
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
          3. Kiểm duyệt &amp; Xử lý vi phạm
        </h3>
        <p>
          Hệ thống gợi ý điểm uy tín/lớp phù hợp áp dụng thuật toán minh bạch theo{" "}
          <strong>Luật Trí tuệ nhân tạo 134/2025/QH15 &amp; NĐ 142/2026/NĐ-CP</strong>. Quản trị viên có quyền cảnh cáo, ẩn tin đăng hoặc tạm khóa tài khoản nếu phát hiện hành vi vi phạm thông qua hệ thống báo cáo hoặc nhật ký hoạt động.
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
