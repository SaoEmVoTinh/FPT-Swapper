import threading
import time
from collections import deque

from fastapi import HTTPException, status

_LOCK = threading.Lock()
_BUCKETS: dict[str, deque[float]] = {}


def check_rate_limit(
    key: str,
    max_requests: int = 10,
    window_seconds: int = 60,
    detail: str = "Quá nhiều yêu cầu đăng nhập. Vui lòng thử lại sau ít phút.",
) -> None:
    """Sliding-window in-memory rate limiter raising HTTP 429 when exceeded."""
    now = time.monotonic()
    cutoff = now - window_seconds
    with _LOCK:
        bucket = _BUCKETS.setdefault(key, deque())
        while bucket and bucket[0] <= cutoff:
            bucket.popleft()
        if len(bucket) >= max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=detail,
            )
        bucket.append(now)


def clear_rate_limits() -> None:
    """Clear all rate limit buckets (intended for automated tests)."""
    with _LOCK:
        _BUCKETS.clear()
