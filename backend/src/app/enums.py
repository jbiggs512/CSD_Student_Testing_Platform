from enum import Enum

# Statuses
class AccountStatus(str, Enum):
    PENDING = "pending"
    ACTIVE = "active"
    DISABLED = "disabled"

class SubjectStatus(str, Enum):
    ACTIVE = "active"
    DISABLED = "disabled"

# Roles
class UserRole(str, Enum):
    STUDENT = "student"
    LECTURER = "lecturer"
    ADMIN = "admin"