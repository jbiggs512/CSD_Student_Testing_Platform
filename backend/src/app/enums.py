from enum import Enum

class AccountStatus(str, Enum):
    PENDING = "pending"
    ACTIVE = "active"
    DISABLED = "disabled"

class SubjectStatus(str, Enum):
    ACTIVE = "active"
    DISABLED = "disabled"