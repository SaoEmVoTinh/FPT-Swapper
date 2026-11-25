import { AlertCircle } from "lucide-react";

export function DisclaimerBanner({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/90 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200 ${
        compact ? "px-3.5 py-2.5 text-xs" : "px-4 py-3 text-sm"
      }`}
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <p className="leading-relaxed">
        <span className="font-semibold">Lưu ý quan trọng:</span> FPT ClassSwap là
        nền tảng hỗ trợ kết nối sinh viên,{" "}
        <span className="font-semibold">
          không phải hệ thống đăng ký tín chỉ chính thức của FPT
        </span>
        . Match chỉ thể hiện sự đồng thuận ban đầu; hai bên cần tự thực hiện thủ
        tục đổi lớp theo quy định của nhà trường.
      </p>
    </div>
  );
}
