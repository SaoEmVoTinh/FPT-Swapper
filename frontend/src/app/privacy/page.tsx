import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-3xl space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:underline dark:text-orange-400"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Quay lại
          </Link>
          <ThemeToggle variant="icon" />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">
              Chính sách Bảo vệ Dữ liệu Cá nhân
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Phiên bản 2026-ND13-v1 • Tuân thủ Nghị định 13/2023/NĐ-CP của Chính phủ
            </p>
          </div>
        </div>

        <section className="space-y-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            1. Phạm vi &amp; Dữ liệu cá nhân được thu thập
          </h2>
          <p>
            FPT Swapper chỉ thu thập dữ liệu tối thiểu để vận hành tính năng
            kết nối đổi lớp giữa sinh viên FPT, bao gồm: họ tên, mã số sinh viên,
            địa chỉ email, cơ sở học tập (Campus), ngành học, thông tin yêu cầu
            đổi lớp, lịch sử ghép đôi (Match), tin nhắn trao đổi và nhật ký
            bảo mật tài khoản.
          </p>
        </section>

        <section className="space-y-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            2. Mục đích xử lý dữ liệu
          </h2>
          <ul className="list-inside list-disc space-y-1">
            <li>Xác thực tài khoản, chống truy cập trái phép (2FA, rate-limit).</li>
            <li>Đề xuất các cặp hoặc vòng đổi lớp tương thích và phát hiện trùng TKB.</li>
            <li>Hỗ trợ trao đổi 1-1 / nhóm 3 bên và gửi thông báo liên quan đến đổi lớp.</li>
            <li>Xử lý báo cáo vi phạm, ngăn chặn hành vi gian lận hoặc quấy rối.</li>
          </ul>
        </section>

        <section className="space-y-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            3. Kiểm soát hiển thị &amp; Bảo vệ quyền riêng tư
          </h2>
          <p>
            Trên trang Discover, mã số sinh viên được che một phần và email được
            ẩn hoàn toàn trước khi Match. Sau khi Match được xác nhận, email và
            MSSV đầy đủ chỉ hiển thị nếu bạn chủ động bật tùy chọn{" "}
            <strong>Chia sẻ Email &amp; MSSV sau khi Match</strong> trong Hồ sơ.
          </p>
        </section>

        <section className="space-y-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            4. Quyền của chủ thể dữ liệu (Nghị định 13/2023/NĐ-CP)
          </h2>
          <ul className="list-inside list-disc space-y-1">
            <li>
              <strong>Quyền truy cập &amp; sao lưu:</strong> Tải toàn bộ dữ liệu cá nhân
              định dạng <code>.json</code> tại <em>Hồ sơ → Hoạt động &amp; Dữ liệu</em>.
            </li>
            <li>
              <strong>Quyền chỉnh sửa:</strong> Tự cập nhật hồ sơ, email, MSSV hoặc
              tùy chọn thông báo bất kỳ lúc nào.
            </li>
            <li>
              <strong>Quyền rút lại sự đồng ý &amp; xóa dữ liệu:</strong> Yêu cầu xóa tài
              khoản tại <em>Hồ sơ → Tài khoản</em> (thời gian chờ khôi phục 14 ngày
              trước khi xóa vĩnh viễn; các báo cáo vi phạm liên quan được ẩn danh hóa).
            </li>
          </ul>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 text-xs dark:border-slate-800">
          <Link href="/terms" className="font-semibold text-orange-600 hover:underline dark:text-orange-400">
            Xem Điều khoản sử dụng →
          </Link>
          <span className="text-slate-400">FPT Swapper • Bảo vệ dữ liệu cá nhân</span>
        </div>
      </div>
    </div>
  );
}
