from enum import Enum


class UserRole(str, Enum):
    STUDENT = "STUDENT"
    MODERATOR = "MODERATOR"
    ADMIN = "ADMIN"


class SwapRequestStatus(str, Enum):
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    PAUSED = "PAUSED"
    MATCHED = "MATCHED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    EXPIRED = "EXPIRED"


class MatchStatus(str, Enum):
    PENDING_CONFIRMATION = "PENDING_CONFIRMATION"
    CONFIRMED = "CONFIRMED"
    DECLINED = "DECLINED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class SwipeAction(str, Enum):
    LIKE = "LIKE"
    PASS = "PASS"


class ConversationType(str, Enum):
    DIRECT = "DIRECT"
    GROUP = "GROUP"

