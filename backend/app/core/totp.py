import base64
import hashlib
import hmac
import secrets
import struct
import time
from urllib.parse import quote


def generate_totp_secret() -> str:
    """Generate a Base32-encoded 160-bit TOTP secret compatible with Google Authenticator."""
    return base64.b32encode(secrets.token_bytes(20)).decode("ascii").rstrip("=")


def build_otpauth_uri(email: str, secret: str, issuer: str = "FPT Swapper") -> str:
    label = quote(f"{issuer}:{email}")
    issuer_q = quote(issuer)
    return f"otpauth://totp/{label}?secret={secret}&issuer={issuer_q}&digits=6&period=30"


def _hotp(secret: str, counter: int) -> str:
    padded = secret.strip().upper()
    padded += "=" * ((8 - len(padded) % 8) % 8)
    key = base64.b32decode(padded, casefold=True)
    msg = struct.pack(">Q", counter)
    digest = hmac.new(key, msg, hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    code_int = (struct.unpack(">I", digest[offset : offset + 4])[0] & 0x7FFFFFFF) % 1_000_000
    return f"{code_int:06d}"


def current_totp(secret: str, for_time: int | None = None) -> str:
    ts = int(time.time()) if for_time is None else for_time
    return _hotp(secret, ts // 30)


def verify_totp(secret: str, code: str, window: int = 1) -> bool:
    cleaned = code.strip().replace(" ", "")
    if not cleaned.isdigit() or len(cleaned) != 6:
        return False
    counter = int(time.time()) // 30
    for offset in range(-window, window + 1):
        if hmac.compare_digest(_hotp(secret, counter + offset), cleaned):
            return True
    return False
