from app.models.user import User
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.task import Task
from app.models.integration import Integration
from app.models.file import UserFile
from app.models.image import GeneratedImage
from app.models.chunk import FileChunk
from app.models.memory import Memory
from app.models.automation import Automation
from app.models.notification import Notification
from app.models.permission import Permission
from app.models.audit_log import AuditLog
from app.models.pending_action import PendingAction
from app.models.plan import Plan
from app.models.subscription import Subscription
from app.models.usage import UsageRecord
from app.models.feature_flag import FeatureFlag
from app.models.announcement import Announcement
from app.models.bee import BeeTask, BeeCheckpoint, BeePermission  # noqa: F401
from app.models.generated_video import GeneratedVideo  # noqa: F401
from app.models.learn import LearnSession, Flashcard, QuizAttempt  # noqa: F401
from app.models.note import Note  # noqa: F401
from app.models.goal import Goal  # noqa: F401
from app.models.practice import PracticeTest  # noqa: F401

# ─── Connect: friends, chats, messages ───
from app.models.friendship import Friendship  # noqa: F401
from app.models.chat import Chat  # noqa: F401
from app.models.chat_member import ChatMember  # noqa: F401
from app.models.chat_message import ChatMessage  # noqa: F401


__all__ = [
    "User",
    "Conversation",
    "Message",
    "Task",
    "Integration",
    "UserFile",
    "GeneratedImage",
    "FileChunk",
    "Memory",
    "Automation",
    "Notification",
    "Permission",
    "AuditLog",
    "PendingAction",
    "Plan",
    "Subscription",
    "UsageRecord",          # ✅ comma added
    "FeatureFlag",
    "Announcement",
    "BeeTask",              # ✅ comma added
    "BeeCheckpoint",        # ✅ comma added
    "BeePermission",
    "GeneratedVideo",
    "LearnSession",
    "Flashcard",
    "QuizAttempt",
    "Note",
    "Goal",
    "PracticeTest",
    # Connect
    "Friendship",
    "Chat",
    "ChatMember",
    "ChatMessage",
]