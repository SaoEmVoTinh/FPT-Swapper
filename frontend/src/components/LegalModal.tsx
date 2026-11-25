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
            Phiên bản 2026-ND13-v1 • Tuân thủ Nghị định 13/2023/NĐ-CP của Chính phủ
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
          lịch sử ghép đôi (Match), tin nhắn trao đổi và nhật ký bảo mật tài khoản.
        </p>
      </section>

      <section className="space-y-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
          2. Mục đích xử lý dữ liệu
        </h3>
        <ul className="list-inside list-disc space-y-1">
          <li>Xác thực tài khoản, chống truy cập trái phép (2FA, rate-limit).</li>
          <li>Đề xuất các cặp hoặc vòng đổi lớp tương thích trong cùng Campus.</li>
          <li>Hỗ trợ trao đổi 1-1 / nhóm 3 bên và gửi thông báo liên quan đến đổi lớp.</li>
          <li>Xử lý báo cáo vi phạm, ngăn chặn hành vi gian lận hoặc quấy rối.</li>
        </ul>
      </section>

      <section className="space-y-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
          3. Kiểm soát hiển thị &amp; Bảo vệ quyền riêng tư
        </h3>
        <p>
          Trên trang Discover, mã số sinh viên được che một phần và email được ẩn hoàn
          toàn trước khi Match. Sau khi Match được xác nhận, email và MSSV đầy đủ chỉ
          hiển thị nếu bạn chủ động bật tùy chọn{" "}
          <strong>Chia sẻ Email &amp; MSSV sau khi Match</strong> trong Hồ sơ.
        </p>
      </section>

      <section className="space-y-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
          4. Quyền của chủ thể dữ liệu (Nghị định 13/2023/NĐ-CP)
        </h3>
        <ul className="list-inside list-disc space-y-1">
          <li>
            <strong>Quyền truy cập &amp; sao lưu:</strong> Tải toàn bộ dữ liệu cá nhân
            định dạng <code>.json</code> tại <em>Hồ sơ → Hoạt động &amp; Dữ liệu</em>.
          </li>
          <li>
            <strong>Quyền chỉnh sửa:</strong> Tự cập nhật hồ sơ, lớp học hoặc tùy chọn
            thông báo bất kỳ lúc nào (Email &amp; MSSV được khóa cố định sau khi đăng ký).
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
            Áp dụng cho toàn bộ người dùng nền tảng FPT Swapper
          </p>
        </div>
      </div>

      <section className="space-y-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
          1. Bản chất nền tảng
        </h3>
        <p>
          FPT Swapper là nền tảng hỗ trợ kết nối sinh viên tìm người đổi lớp tương
          thích. Hệ thống{" "}
          <strong>không phải cổng đăng ký tín chỉ chính thức của Trường Đại học FPT</strong>{" "}
          và không tự động thay đổi lớp trên FAP. Mọi thủ tục chuyển lớp chính thức phải
          được hai bên tự thực hiện theo quy định của nhà trường.
        </p>
      </section>

      <section className="space-y-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
          2. Trách nhiệm &amp; Quy tắc ứng xử
        </h3>
        <ul className="list-inside list-disc space-y-1">
          <li>Cung cấp thông tin môn học, lớp hiện tại và lớp mong muốn trung thực.</li>
          <li>Không spam tin nhắn, không sử dụng ngôn ngữ thiếu tôn trọng hoặc lừa đảo.</li>
          <li>
            Không tự ý bỏ hẹn sau khi đã xác nhận đổi lớp; trường hợp bất khả kháng cần
            thông báo và hủy Match sớm.
          </li>
          <li>Không thu thập hoặc phát tán thông tin cá nhân của sinh viên khác trái phép.</li>
        </ul>
      </section>

      <section className="space-y-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
          3. Kiểm duyệt &amp; Xử lý vi phạm
        </h3>
        <p>
          Quản trị viên có quyền cảnh cáo, ẩn tin đăng hoặc tạm khóa tài khoản nếu phát
          hiện hành vi vi phạm thông qua hệ thống báo cáo hoặc nhật ký hoạt động.
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
