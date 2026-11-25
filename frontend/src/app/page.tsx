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

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/fpt-logo2.png"
              alt="FPT ClassSwap"
              width={36}
              height={36}
              className="h-9 w-9 rounded-xl object-contain"
            />
            <span className="text-lg font-bold tracking-tight">
              FPT ClassSwap
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-xl px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
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
      <section className="relative overflow-hidden bg-gradient-to-b from-orange-50/70 via-white to-white py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3.5 py-1.5 text-xs font-semibold text-orange-700">
              <Sparkles className="h-3.5 w-3.5" />
              Nền tảng kết nối sinh viên FPT — MVP ClassSwap
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Tìm người đổi lớp{" "}
              <span className="text-orange-500">nhanh & chuẩn</span> theo lịch
              học
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-slate-600">
              Không còn phải lướt hàng trăm tin nhắn trong group chat. Tạo yêu
              cầu đổi lớp, quẹt Like các yêu cầu tương thích hai chiều và trao
              đổi trực tiếp ngay khi Match.
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
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-base font-semibold text-slate-700 hover:bg-slate-50 transition-colors sm:w-auto"
              >
                <Flame className="h-4 w-4 text-orange-500" />
                Thử Discover kiểu Tinder
              </Link>
            </div>
          </div>

          <div className="mx-auto mt-10 max-w-3xl">
            <DisclaimerBanner />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 border-t border-slate-100 bg-slate-50/50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Quy trình đổi lớp 4 bước
            </h2>
            <p className="mt-2 text-slate-600">
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
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-400">
                      STEP {item.step}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Ecosystem Roadmap */}
      <section className="py-16 border-t border-slate-100">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                Định hướng hệ sinh thái kết nối sinh viên
              </h2>
              <p className="mt-2 text-slate-600">
                ClassSwap là mảnh ghép đầu tiên, dùng chung hồ sơ và hệ thống
                chat cho toàn nền tảng.
              </p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border-2 border-orange-500 bg-orange-50/30 p-6">
              <span className="inline-block rounded-full bg-orange-500 px-3 py-1 text-xs font-semibold text-white">
                MVP Hiện tại
              </span>
              <h3 className="mt-4 text-lg font-bold text-slate-900">
                ClassSwap
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Tìm người đổi lớp tương thích hai chiều, chat 1-1 và xác nhận
                trao đổi.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <span className="inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                Giai đoạn tiếp theo
              </span>
              <h3 className="mt-4 flex items-center gap-2 text-lg font-bold text-slate-900">
                <Users className="h-5 w-5 text-slate-400" />
                StudyBuddy
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Tìm bạn học cùng môn, cùng lịch rảnh và mục tiêu học tập.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <span className="inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                Mở rộng
              </span>
              <h3 className="mt-4 flex items-center gap-2 text-lg font-bold text-slate-900">
                <ShieldAlert className="h-5 w-5 text-slate-400" />
                TeamFinder
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Tìm thành viên cho đồ án, SWP391 hoặc các cuộc thi học thuật.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-slate-50 py-8 text-center text-sm text-slate-500">
        <div className="mx-auto max-w-6xl px-4">
          FPT ClassSwap — Student Connection Platform (MVP). Không phải hệ
          thống đăng ký tín chỉ chính thức của Trường Đại học FPT.
        </div>
      </footer>
    </div>
  );
}
