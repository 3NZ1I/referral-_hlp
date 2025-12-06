import pytest
from backend import api
from backend.models import Case
from backend.scripts.migration_promote_raw import apply_backfill, rollback_backfill


def test_apply_backfill_promotes_keys():
    db = api.SessionLocal()
    # Create a case with nested body wrapper
    c = Case(title='Migration Case', raw={'body': {'family': [{'name': 'Bob'}], 'caseNumber': 'MIG-123', '_submission_time': '2024-01-01T00:00:00Z'}})
    db.add(c)
    db.commit()
    db.refresh(c)
    assert 'body' in c.raw
    # Apply migration
    modified = apply_backfill(db, dry_run=False)
    assert modified >= 1
    db.refresh(c)
    assert c.raw.get('family') is not None
    assert c.raw.get('caseNumber') == 'MIG-123'
    assert c.raw.get('_submission_time') == '2024-01-01T00:00:00Z'
    assert '_body_backup' in c.raw
    db.close()


def test_rollback_restores_backup():
    db = api.SessionLocal()
    # Create a case with nested body wrapper
    c = Case(title='Migration Case 2', raw={'body': {'family': [{'name': 'Eve'}], 'caseNumber': 'MIG-222'}})
    db.add(c)
    db.commit()
    db.refresh(c)
    # Apply then rollback
    apply_backfill(db, dry_run=False)
    db.refresh(c)
    assert c.raw.get('caseNumber') == 'MIG-222'
    # Now rollback
    restored = rollback_backfill(db)
    assert restored >= 1
    db.refresh(c)
    # After rollback, body should exist and promoted keys removed
    assert 'body' in c.raw
    assert c.raw.get('caseNumber') is None
    assert '_body_backup' not in c.raw
    db.close()


def test_get_case_after_migration_is_flattened(client):
    # Directly insert a row with nested body using a SessionLocal
    db = api.SessionLocal()
    c = Case(title='Migration Case 3', raw={'body': {'family': [{'name': 'Zoe'}], 'caseNumber': 'MIG-333', '_submission_time': '2024-01-04T12:00:00Z'}})
    db.add(c)
    db.commit()
    db.refresh(c)
    apply_backfill(db, dry_run=False)
    # Use API client to GET /cases and assert promoted keys are visible in response
    res = client.get('/cases')
    assert res.status_code == 200
    cases = res.json()
    found = None
    for it in cases:
        if it['title'] == 'Migration Case 3':
            found = it
            break
    assert found is not None
    assert found['raw'].get('caseNumber') == 'MIG-333'
    assert found['raw'].get('_submission_time') == '2024-01-04T12:00:00Z'
    db.close()
