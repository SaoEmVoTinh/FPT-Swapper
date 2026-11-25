import uuid
from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.common.enums import ConversationSourceType, ConversationStatus, MessageType
from app.database.models.communication import Conversation, ConversationMember, Message
from app.modules.chat.schemas import MessageCreate


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
            content=data.content,
            message_type=MessageType.TEXT,
            client_message_id=data.client_message_id or str(uuid.uuid4()),
        )
        db.add(msg)
        db.commit()
        db.refresh(msg)
        return msg

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
