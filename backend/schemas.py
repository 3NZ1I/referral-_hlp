from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    ability: Optional[str] = None
    role: Optional[str] = "user"
    must_change_password: Optional[bool] = False


class UserCreate(UserBase):
    password: str


class UserRead(UserBase):
    id: int
    created_at: Optional[datetime]
    must_change_password: Optional[bool] = False

    class Config:
        orm_mode = True


class CaseBase(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = "open"
    assigned_to_id: Optional[int] = None
    raw: Optional[dict] = None


class CaseCreate(CaseBase):
    title: str


class CaseUpdate(CaseBase):
    resolve_comment: Optional[str] = None


class CaseRead(CaseBase):
    id: int
    created_at: Optional[datetime]
    assigned_to: Optional[UserRead]
    raw: Optional[dict]

    class Config:
        orm_mode = True


class CommentCreate(BaseModel):
    content: str


class CommentRead(BaseModel):
    id: int
    case_id: int
    user_id: Optional[int]
    content: str
    created_at: Optional[datetime]
    user: Optional[UserRead]

    class Config:
        orm_mode = True
