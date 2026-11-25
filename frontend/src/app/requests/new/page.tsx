"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LegacyNewRequestRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/requests?create=1");
  }, [router]);

  return null;
}
