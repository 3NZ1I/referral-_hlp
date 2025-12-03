from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    ability = Column(String, nullable=True)
    # Authentication fields
    username = Column(String, unique=True, nullable=True, index=True)
    email = Column(String, unique=True, nullable=True, index=True)
    password_hash = Column(String, nullable=True)
    role = Column(String, default="user")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    cases = relationship("Case", back_populates="assigned_to")

class Case(Base):
    __tablename__ = "cases"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, default="open")
    assigned_to_id = Column(Integer, ForeignKey("users.id"))
    assigned_to = relationship("User", back_populates="cases")
    comments = relationship("Comment", back_populates="case")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Comment(Base):
    __tablename__ = "comments"
    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    case = relationship("Case", back_populates="comments")
    user = relationship("User")
