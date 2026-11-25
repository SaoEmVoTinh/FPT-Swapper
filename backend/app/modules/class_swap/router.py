import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_student
from app.database.models.identity import Student
from app.database.session import get_db
from app.modules.class_swap.schemas import (
    CreateRequestSchema,
    RequestResponse,
    UpdateRequestSchema,
)
from app.modules.class_swap.service import ClassSwapService

router = APIRouter(prefix="/class-swap", tags=["Class Swap"])


@router.post("/requests", response_model=RequestResponse, status_code=status.HTTP_201_CREATED)
def create_request(
    data: CreateRequestSchema,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    return ClassSwapService.create(db, current_student.id, data)


@router.get("/requests/me", response_model=list[RequestResponse])
def list_my_requests(
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    return ClassSwapService.list_mine(db, current_student.id)


@router.get("/requests/{request_id}", response_model=RequestResponse)
def get_request(
    request_id: uuid.UUID,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    req = ClassSwapService.get(db, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    # students can read their own; admins can read any (admin dep not added here — use admin router)
    if req.student_id != current_student.id:
        raise HTTPException(status_code=403, detail="Not your request")
    return req


@router.put("/requests/{request_id}", response_model=RequestResponse)
def update_request(
    request_id: uuid.UUID,
    data: UpdateRequestSchema,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    req = ClassSwapService.get_owned(db, request_id, current_student.id)
    return ClassSwapService.update(db, req, current_student.id, data)


@router.delete("/requests/{request_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_request(
    request_id: uuid.UUID,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    req = ClassSwapService.get_owned(db, request_id, current_student.id)
    ClassSwapService.cancel(db, req)
