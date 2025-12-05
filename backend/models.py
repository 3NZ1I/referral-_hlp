from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, JSON, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    ability = Column(String(255), nullable=True)
    # Authentication fields
    username = Column(String(255), unique=True, nullable=True, index=True)
    email = Column(String(255), unique=True, nullable=True, index=True)
    password_hash = Column(String(255), nullable=True)
    role = Column(String(50), default="user")
    must_change_password = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    cases = relationship("Case", back_populates="assigned_to")



class Case(Base):
    __tablename__ = "cases"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="open")
    assigned_to_id = Column(Integer, ForeignKey("users.id"))
    assigned_to = relationship("User", back_populates="cases")
    comments = relationship("Comment", back_populates="case")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    # Raw form data (incoming XLSX JSON) — used by frontend to backfill formFields
    raw = Column(JSON, nullable=True)



class Comment(Base):
    __tablename__ = "comments"
    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    case = relationship("Case", back_populates="comments")
    user = relationship("User")


class ImportJob(Base):
    __tablename__ = 'import_jobs'
    id = Column(Integer, primary_key=True, index=True)
    uploader_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    uploader_name = Column(String(255), nullable=True)
    filename = Column(String(512), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    rows = relationship('ImportRow', back_populates='job')


class ImportRow(Base):
    __tablename__ = 'import_rows'
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey('import_jobs.id'))
    job = relationship('ImportJob', back_populates='rows')
    row_number = Column(Integer, nullable=True)
    raw = Column(JSON, nullable=True)
    status = Column(String(32), default='pending')
    error = Column(Text, nullable=True)
    case_id = Column(Integer, ForeignKey('cases.id'), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
