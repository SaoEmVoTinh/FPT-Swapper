from enum import Enum


class UserRole(str, Enum):
    STUDENT = "STUDENT"
    MODERATOR = "MODERATOR"
    ADMIN = "ADMIN"
    SUPER_ADMIN = "SUPER_ADMIN"


class AccountStatus(str, Enum):
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"
    CLOSED = "CLOSED"


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
    EXPIRED = "EXPIRED"


class SwipeAction(str, Enum):
    LIKE = "LIKE"
    PASS = "PASS"


class ConversationType(str, Enum):
    DIRECT = "DIRECT"
    GROUP = "GROUP"


class ConversationSourceType(str, Enum):
    CLASS_SWAP = "CLASS_SWAP"
    STUDY_BUDDY = "STUDY_BUDDY"
    TEAM_FINDER = "TEAM_FINDER"


class ConversationStatus(str, Enum):
    ACTIVE = "ACTIVE"
    READ_ONLY = "READ_ONLY"
    CLOSED = "CLOSED"


class MessageType(str, Enum):
    TEXT = "TEXT"
    IMAGE = "IMAGE"
    SYSTEM = "SYSTEM"


class NotificationType(str, Enum):
    MATCH = "MATCH"
    MESSAGE = "MESSAGE"
    SYSTEM = "SYSTEM"


class ReportStatus(str, Enum):
    OPEN = "OPEN"
    UNDER_REVIEW = "UNDER_REVIEW"
    RESOLVED = "RESOLVED"
    DISMISSED = "DISMISSED"


class EnrollmentStatus(str, Enum):
    ENROLLED = "ENROLLED"
    DROPPED = "DROPPED"
    COMPLETED = "COMPLETED"
