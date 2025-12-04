from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


class UserBase(BaseModel):
    username: Optional[str]
    email: Optional[EmailStr]
    name: Optional[str]
    ability: Optional[str]
    role: Optional[str] = "user"


class UserCreate(UserBase):
    password: str


class UserRead(UserBase):
    id: int
    created_at: Optional[datetime]

    class Config:
        orm_mode = True


class CaseBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: Optional[str] = "open"
    assigned_to_id: Optional[int]


class CaseCreate(CaseBase):
    pass


class CaseRead(CaseBase):
    id: int
    created_at: Optional[datetime]
    assigned_to: Optional[UserRead]

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

    class Config:
        orm_mode = True
