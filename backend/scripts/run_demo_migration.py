from backend import api
from backend.models import Base, Case
from backend.scripts.migration_promote_raw import apply_backfill, rollback_backfill
from sqlalchemy import create_engine
import os

def main():
    # Use in-memory DB if not configured
    db_url = os.environ.get('DATABASE_URL', 'sqlite:///:memory:')
    Base.metadata.create_all(bind=api.engine)
    db = api.SessionLocal()
    c = Case(title='Demo Migration', raw={'body': {'family': [{'name': 'Demo'}], 'caseNumber': 'DM-001', '_submission_time': '2024-03-03T00:00:00Z'}})
    db.add(c)
    db.commit()
    print('Created demo case id', c.id)
    print('Dry-run:', apply_backfill(db, dry_run=True))
    print('Apply:', apply_backfill(db, dry_run=False))
    db.refresh(c)
    print('Promoted raw', c.raw)
    print('Rollback:', rollback_backfill(db))
    db.refresh(c)
    print('After rollback', c.raw)
    db.close()

if __name__ == '__main__':
    main()
