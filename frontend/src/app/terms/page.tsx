import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function TermsOfUsePage() {
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
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Điều khoản Sử dụng</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Áp dụng cho toàn bộ người dùng nền tảng FPT ClassSwap
            </p>
          </div>
        </div>

        <section className="space-y-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            1. Bản chất nền tảng
          </h2>
          <p>
            FPT ClassSwap là nền tảng hỗ trợ kết nối sinh viên tìm người đổi lớp
            tương thích. Hệ thống <strong>không phải cổng đăng ký tín chỉ chính thức của Trường Đại học FPT</strong>{" "}
            và không tự động thay đổi lớp trên FAP. Mọi thủ tục chuyển lớp chính thức
            phải được hai bên tự thực hiện theo quy định của nhà trường.
          </p>
        </section>

        <section className="space-y-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            2. Trách nhiệm &amp; Quy tắc ứng xử
          </h2>
          <ul className="list-inside list-disc space-y-1">
            <li>Cung cấp thông tin môn học, lớp hiện tại và lớp mong muốn trung thực.</li>
            <li>Không spam tin nhắn, không sử dụng ngôn ngữ thiếu tôn trọng hoặc lừa đảo.</li>
            <li>Không tự ý bỏ hẹn sau khi đã xác nhận đổi lớp; trường hợp bất khả kháng cần thông báo và hủy Match sớm.</li>
            <li>Không thu thập hoặc phát tán thông tin cá nhân của sinh viên khác trái phép.</li>
          </ul>
        </section>

        <section className="space-y-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            3. Kiểm duyệt &amp; Xử lý vi phạm
          </h2>
          <p>
            Quản trị viên có quyền cảnh cáo, ẩn tin đăng hoặc tạm khóa tài khoản nếu
            phát hiện hành vi vi phạm thông qua hệ thống báo cáo hoặc nhật ký hoạt động.
          </p>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 text-xs dark:border-slate-800">
          <Link href="/privacy" className="font-semibold text-orange-600 hover:underline dark:text-orange-400">
            ← Xem Chính sách Bảo vệ Dữ liệu Cá nhân
          </Link>
          <span className="text-slate-400">FPT ClassSwap</span>
        </div>
      </div>
    </div>
  );
}
