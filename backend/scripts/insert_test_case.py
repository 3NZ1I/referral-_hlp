from backend import api
from backend.models import Base, Case

def main():
    Base.metadata.create_all(bind=api.engine)
    db = api.SessionLocal()
    c = Case(title='Migrate Quick', raw={'body': {'family': [{'name':'TestX'}], 'caseNumber': 'Q-123', '_submission_time': '2024-02-02T00:00:00Z'}})
    db.add(c)
    db.commit()
    print('Inserted case id', c.id)
    db.close()

if __name__ == '__main__':
    main()
