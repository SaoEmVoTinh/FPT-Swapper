import { NextRequest, NextResponse } from "next/server";

const FALLBACK_BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, "") ||
  "http://localhost:8000";

async function proxyToBackend(req: NextRequest) {
  const backendBase = process.env.BACKEND_URL || FALLBACK_BACKEND_URL;
  const targetUrl = new URL(
    `${req.nextUrl.pathname}${req.nextUrl.search}`,
    backendBase
  );

  const headers = new Headers(req.headers);
  headers.delete("host");

  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  const body = hasBody ? await req.arrayBuffer() : undefined;

  const upstream = await fetch(targetUrl, {
    method: req.method,
    headers,
    body,
    redirect: "manual",
  });

  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete("content-encoding");

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
