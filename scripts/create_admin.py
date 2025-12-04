#!/usr/bin/env python3
"""
Create an admin user for the HLP Referral System

Usage:
    python scripts/create_admin.py

Or inside Docker container:
    docker compose exec backend python scripts/create_admin.py
"""

import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import bcrypt

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from models import Base, User

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_admin_user():
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://user:password@db/referral_db")
    
    print("Creating admin user for HLP Referral System")
    print("=" * 50)
    
    # Get user input
    username = input("Enter admin username (default: admin): ").strip() or "admin"
    email = input("Enter admin email (default: admin@hlp.local): ").strip() or "admin@hlp.local"
    password = input("Enter admin password (minimum 8 characters): ").strip()
    
    if len(password) < 8:
        print("❌ Error: Password must be at least 8 characters")
        return
    
    name = input("Enter full name (default: System Administrator): ").strip() or "System Administrator"
    ability = input("Enter ability/department (optional): ").strip() or None
    
    # Connect to database
    try:
        engine = create_engine(DATABASE_URL)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        
        # Check if user already exists
        existing_user = db.query(User).filter(
            (User.username == username) | (User.email == email)
        ).first()
        
        if existing_user:
            print(f"\n❌ Error: User with username '{username}' or email '{email}' already exists")
            db.close()
            return
        
        # Create admin user
        admin_user = User(
            username=username,
            email=email,
            name=name,
            ability=ability,
            password_hash=hash_password(password),
            role="admin"
        )
        
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        print("\n✅ Admin user created successfully!")
        print("=" * 50)
        print(f"ID:       {admin_user.id}")
        print(f"Username: {admin_user.username}")
        print(f"Email:    {admin_user.email}")
        print(f"Name:     {admin_user.name}")
        print(f"Role:     {admin_user.role}")
        if admin_user.ability:
            print(f"Ability:  {admin_user.ability}")
        print("\n🔐 You can now login at: https://hlp.bessar.work")
        
        db.close()
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\nMake sure:")
        print("1. PostgreSQL database is running")
        print("2. DATABASE_URL environment variable is set correctly")
        print("3. Database tables are created (run migrations)")

if __name__ == "__main__":
    create_admin_user()
