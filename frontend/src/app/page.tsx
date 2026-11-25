import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeftRight,
  ArrowRight,
  CheckCircle2,
  Flame,
  MessageSquare,
  ShieldAlert,
  Sparkles,
  Users,
} from "lucide-react";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/fpt-logo2.png"
              alt="FPT Swapper"
              width={36}
              height={36}
              className="h-9 w-9 rounded-xl object-contain"
            />
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
              FPT Swapper
            </span>
          </Link>

          <div className="flex items-center gap-2.5">
            <ThemeToggle variant="icon" />
            <Link
              href="/login"
              className="rounded-xl px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Đăng nhập
            </Link>
            <Link
              href="/register"
              className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 transition-colors"
            >
              Đăng ký
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-orange-50/80 via-white to-white py-16 dark:from-slate-900 dark:via-slate-950 dark:to-slate-950 sm:py-24">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-80 w-[42rem] -translate-x-1/2 rounded-full bg-orange-200/30 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/90 px-3.5 py-1.5 text-xs font-semibold text-orange-700 shadow-xs dark:border-orange-500/35 dark:bg-slate-900/90 dark:text-orange-300">
              <Sparkles className="h-3.5 w-3.5" />
              Nền tảng kết nối sinh viên FPTU — 5 Campus toàn quốc
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-5xl lg:text-6xl">
              Tìm người đổi lớp{" "}
              <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                nhanh &amp; chuẩn
              </span>{" "}
              theo lịch học
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-slate-600 dark:text-slate-300">
              Không còn phải lướt hàng trăm tin nhắn trong group chat. Tạo yêu
              cầu đổi lớp, quẹt Like các yêu cầu trong campus và nhắn tin trực
              tiếp ngay khi hai bên Match.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/dashboard"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-3.5 text-base font-semibold text-white shadow-md shadow-orange-500/20 hover:bg-orange-600 transition-all sm:w-auto"
              >
                Vào trải nghiệm ngay
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/discover"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-base font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 sm:w-auto"
              >
                <Flame className="h-4 w-4 text-orange-500" />
                Mở Discover đổi lớp
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-3 text-left sm:grid-cols-4">
              {[
                { value: "5 Cơ sở", label: "HN • ĐN • HCM • QN • CT" },
                { value: "100+ Môn", label: "Danh mục FPTU chuẩn" },
                { value: "Match 2 chiều", label: "Cả 2 cùng Like mới ghép" },
                { value: "Chat 1-1", label: "Thông báo realtime tức thì" },
              ].map((stat) => (
                <div
                  key={stat.value}
                  className="rounded-2xl border border-slate-200/80 bg-white/90 p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900/90"
                >
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {stat.value}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mx-auto mt-10 max-w-3xl">
            <DisclaimerBanner />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-slate-100 bg-slate-50/50 py-16 dark:border-slate-800 dark:bg-slate-900/40">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">
              Quy trình đổi lớp 4 bước
            </h2>
            <p className="mt-2 text-slate-600 dark:text-slate-300">
              Matching hai chiều chính xác — chỉ kết nối khi cả hai cùng đồng ý.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: "01",
                title: "Tạo yêu cầu",
                desc: "Chọn học kỳ, môn học, lớp hiện tại và lớp mong muốn từ danh mục chuẩn.",
                icon: ArrowLeftRight,
              },
              {
                step: "02",
                title: "Discover & Swipe",
                desc: "Xem các yêu cầu tương thích ngược chiều và chọn Like hoặc Pass.",
                icon: Flame,
              },
              {
                step: "03",
                title: "Mutual Like → Match",
                desc: "Khi cả hai cùng Like, hệ thống tạo đúng một Match an toàn.",
                icon: CheckCircle2,
              },
              {
                step: "04",
                title: "Chat & Xác nhận",
                desc: "Nhắn tin thống nhất, xác nhận đổi lớp và làm thủ tục chính thức với trường.",
                icon: MessageSquare,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.step}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-400">
                      STEP {item.step}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Ecosystem Roadmap */}
      <section className="border-t border-slate-100 py-16 dark:border-slate-800">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">
                Định hướng hệ sinh thái kết nối sinh viên
              </h2>
              <p className="mt-2 text-slate-600 dark:text-slate-300">
                FPT Swapper là mảnh ghép đầu tiên, dùng chung hồ sơ và hệ thống
                chat cho toàn nền tảng.
              </p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border-2 border-orange-500 bg-orange-50/30 p-6 dark:bg-orange-500/10">
              <span className="inline-block rounded-full bg-orange-500 px-3 py-1 text-xs font-semibold text-white">
                MVP Hiện tại
              </span>
              <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-slate-100">
                FPT Swapper
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Tìm người đổi lớp tương thích hai chiều, chat 1-1 và xác nhận
                trao đổi.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <span className="inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                Giai đoạn tiếp theo
              </span>
              <h3 className="mt-4 flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100">
                <Users className="h-5 w-5 text-slate-400" />
                StudyBuddy
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Tìm bạn học cùng môn, cùng lịch rảnh và mục tiêu học tập.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <span className="inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                Mở rộng
              </span>
              <h3 className="mt-4 flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100">
                <ShieldAlert className="h-5 w-5 text-slate-400" />
                TeamFinder
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Tìm thành viên cho đồ án, SWP391 hoặc các cuộc thi học thuật.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-slate-50 py-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
        <div className="mx-auto max-w-6xl px-4">
          FPT Swapper — Student Connection Platform (MVP). Không phải hệ
          thống đăng ký tín chỉ chính thức của Trường Đại học FPT.
        </div>
      </footer>
    </div>
  );
}
