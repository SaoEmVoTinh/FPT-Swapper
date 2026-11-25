import uuid
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.common.enums import ConversationSourceType, ConversationStatus, MessageType
from app.core.rate_limit import check_rate_limit
from app.database.models.communication import Conversation, ConversationMember, Message
from app.database.models.identity import StudentBlock
from app.modules.chat.schemas import MessageCreate
from app.modules.notifications.delivery import dispatch_out_of_app


class ChatService:
    @staticmethod
    def _assert_member(db: Session, conversation: Conversation, student_id: uuid.UUID) -> None:
        is_member = any(m.student_id == student_id for m in conversation.members)
        if not is_member:
            raise HTTPException(403, "You are not a member of this conversation")

    @staticmethod
    def list_conversations(db: Session, student_id: uuid.UUID) -> list[Conversation]:
        return (
            db.query(Conversation)
            .join(ConversationMember, ConversationMember.conversation_id == Conversation.id)
            .filter(ConversationMember.student_id == student_id)
            .order_by(Conversation.updated_at.desc())
            .all()
        )

    @staticmethod
    def get_conversation(db: Session, conversation_id: uuid.UUID, student_id: uuid.UUID) -> Conversation:
        conv = db.get(Conversation, conversation_id)
        if not conv:
            raise HTTPException(404, "Conversation not found")
        ChatService._assert_member(db, conv, student_id)
        return conv

    @staticmethod
    def list_messages(
        db: Session,
        conversation_id: uuid.UUID,
        student_id: uuid.UUID,
        limit: int = 50,
        before: datetime | None = None,
    ) -> list[Message]:
        conv = db.get(Conversation, conversation_id)
        if not conv:
            raise HTTPException(404, "Conversation not found")
        ChatService._assert_member(db, conv, student_id)

        q = db.query(Message).filter(Message.conversation_id == conversation_id)
        if before:
            q = q.filter(Message.created_at < before)
        return q.order_by(Message.created_at.desc()).limit(limit).all()

    @staticmethod
    def send_message(
        db: Session,
        conversation_id: uuid.UUID,
        sender_id: uuid.UUID,
        data: MessageCreate,
    ) -> Message:
        conv = db.get(Conversation, conversation_id)
        if not conv:
            raise HTTPException(404, "Conversation not found")
        ChatService._assert_member(db, conv, sender_id)
        if conv.status != ConversationStatus.ACTIVE:
            raise HTTPException(422, "Conversation is not active")

        other_ids = [m.student_id for m in conv.members if m.student_id != sender_id]
        if other_ids:
            blocked = (
                db.query(StudentBlock.id)
                .filter(
                    or_(
                        (StudentBlock.blocker_id == sender_id)
                        & (StudentBlock.blocked_student_id.in_(other_ids)),
                        (StudentBlock.blocker_id.in_(other_ids))
                        & (StudentBlock.blocked_student_id == sender_id),
                    )
                )
                .first()
            )
            if blocked is not None:
                raise HTTPException(
                    403, "Không thể gửi tin nhắn vì người dùng đã bị chặn."
                )

        # Anti-spam rate limit: max 20 messages per 30 seconds per user
        check_rate_limit(f"chat_msg:{sender_id}", max_requests=20, window_seconds=30)

        cleaned_content = (data.content or "").strip()
        attachment_url = (data.attachment_url or "").strip() or None
        if not cleaned_content and not attachment_url:
            raise HTTPException(422, "Tin nhắn không được để trống.")
        msg_type = (
            MessageType.IMAGE
            if attachment_url is not None or data.message_type == MessageType.IMAGE
            else data.message_type
        )
        if not cleaned_content and attachment_url:
            cleaned_content = "[Ảnh thời khóa biểu]"

        # Idempotency
        if data.client_message_id:
            existing = (
                db.query(Message)
                .filter(
                    Message.conversation_id == conversation_id,
                    Message.client_message_id == data.client_message_id,
                )
                .first()
            )
            if existing:
                return existing

        msg = Message(
            conversation_id=conversation_id,
            sender_id=sender_id,
            content=cleaned_content,
            attachment_url=attachment_url,
            message_type=msg_type,
            client_message_id=data.client_message_id or str(uuid.uuid4()),
        )
        db.add(msg)
        db.commit()
        db.refresh(msg)

        for other_id in other_ids:
            dispatch_out_of_app(
                db,
                other_id,
                "Tin nhắn mới trên FPT Swapper",
                cleaned_content[:160],
                kind="MESSAGE",
            )
        return msg

    @staticmethod
    def mark_read(
        db: Session,
        conversation_id: uuid.UUID,
        student_id: uuid.UUID,
    ) -> tuple[Conversation, datetime]:
        conv = db.get(Conversation, conversation_id)
        if not conv:
            raise HTTPException(404, "Conversation not found")
        member = (
            db.query(ConversationMember)
            .filter(
                ConversationMember.conversation_id == conversation_id,
                ConversationMember.student_id == student_id,
            )
            .first()
        )
        if member is None:
            raise HTTPException(403, "Not a member of this conversation")
        now = datetime.now(timezone.utc)
        member.last_read_at = now
        db.commit()
        return conv, now

    @staticmethod
    def get_or_create_conversation(
        db: Session,
        source_type: ConversationSourceType,
        source_id: uuid.UUID,
        student_ids: list[uuid.UUID],
    ) -> Conversation:
        """Get existing conversation for a source or create a new one with members."""
        conv = (
            db.query(Conversation)
            .filter(
                Conversation.source_type == source_type,
                Conversation.source_id == source_id,
            )
            .first()
        )
        if conv:
            return conv

        from app.common.enums import ConversationType
        conv = Conversation(
            source_type=source_type,
            source_id=source_id,
            conversation_type=ConversationType.DIRECT,
        )
        db.add(conv)
        db.flush()
        for sid in student_ids:
            db.add(ConversationMember(conversation_id=conv.id, student_id=sid))
        db.commit()
        db.refresh(conv)
        return conv
