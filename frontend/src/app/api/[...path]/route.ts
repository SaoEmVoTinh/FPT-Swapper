import { connection, NextRequest, NextResponse } from "next/server";

const HOP_BY_HOP_HEADERS = new Set([
  "host",
  "connection",
  "keep-alive",
  "transfer-encoding",
  "content-length",
  "te",
  "trailer",
  "upgrade",
  "proxy-authenticate",
  "proxy-authorization",
  "expect",
]);

function resolveBackendBaseUrl(): { url?: string; configError?: string } {
  const isVercel = Boolean(process.env.VERCEL);
  const boundUrl = process.env.BACKEND_URL?.trim();

  if (isVercel) {
    if (!boundUrl) {
      return {
        configError:
          "Thiếu kết nối BACKEND_URL trên Vercel. Vào Vercel → Settings → General: để trống mục Root Directory (không điền frontend) và chọn Framework Preset là Services rồi Redeploy.",
      };
    }
    if (
      boundUrl.includes("localhost") ||
      boundUrl.includes("127.0.0.1")
    ) {
      return {
        configError:
          "Biến BACKEND_URL trên Vercel đang bị đặt thủ công thành localhost. Vào Vercel → Settings → Environment Variables → XÓA biến BACKEND_URL rồi Redeploy để Vercel tự gắn URL Backend.",
      };
    }
    return { url: boundUrl };
  }

  if (boundUrl) {
    return { url: boundUrl };
  }

  if (process.env.NEXT_PUBLIC_API_URL?.startsWith("http")) {
    return {
      url: process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/v1\/?$/, ""),
    };
  }

  return { url: "http://localhost:8001" };
}

async function proxyToBackend(req: NextRequest) {
  await connection();

  const { url: backendBase, configError } = resolveBackendBaseUrl();
  if (!backendBase) {
    return NextResponse.json({ detail: configError }, { status: 502 });
  }

  const targetUrl = new URL(
    `${req.nextUrl.pathname}${req.nextUrl.search}`,
    backendBase
  );

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  const body = hasBody ? await req.arrayBuffer() : undefined;

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: body && body.byteLength > 0 ? body : undefined,
      redirect: "manual",
      cache: "no-store",
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : "unknown error";
    const detail = process.env.VERCEL
      ? `Không kết nối được tới service Backend trên Vercel (${reason}).`
      : "Không kết nối được tới máy chủ Backend local (kiểm tra uvicorn port 8001).";
    return NextResponse.json({ detail }, { status: 502 });
  }

  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (
      lower !== "content-encoding" &&
      lower !== "content-length" &&
      lower !== "transfer-encoding" &&
      lower !== "set-cookie"
    ) {
      responseHeaders.set(key, value);
    }
  });

  const setCookies =
    typeof upstream.headers.getSetCookie === "function"
      ? upstream.headers.getSetCookie()
      : [];
  for (const cookie of setCookies) {
    responseHeaders.append("set-cookie", cookie);
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export async function GET(req: NextRequest) {
  return proxyToBackend(req);
}

export async function POST(req: NextRequest) {
  return proxyToBackend(req);
}

export async function PUT(req: NextRequest) {
  return proxyToBackend(req);
}

export async function PATCH(req: NextRequest) {
  return proxyToBackend(req);
}

export async function DELETE(req: NextRequest) {
  return proxyToBackend(req);
}
