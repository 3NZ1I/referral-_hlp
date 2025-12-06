"""
Simple backfill/rollback script to promote nested raw.body fields into top-level raw keys for existing cases.
This is safe to run on sqlite or postgres (requires proper DATABASE_URL env var set).
Usage:
  python -m backend.scripts.migration_promote_raw --apply
  python -m backend.scripts.migration_promote_raw --rollback

The script relies on SQLAlchemy models in backend.models and the engine from backend.api
"""
import argparse
import json
import logging
import os
from sqlalchemy.orm import Session

from backend.api import SessionLocal
from backend.models import Case, Base
from backend import api as api_module


def promote_body_to_raw(raw: dict) -> dict:
    """Promote known wrapper keys from raw['body'] to raw top-level, while preserving _body_backup.
    Returns the modified dict (mutates a copy)
    """
    if not isinstance(raw, dict):
        return raw
    body = raw.get('body')
    if isinstance(body, str):
        try:
            body = json.loads(body)
        except Exception:
            # non-json body - keep as-is under 'body'
            return raw
    if not isinstance(body, dict):
        return raw
    # preserve backup
    if '_body_backup' not in raw:
        try:
            raw['_body_backup'] = dict(body)
        except Exception:
            raw['_body_backup'] = body
    # candidates
    candidates = ['_submission_time','submissiontime','submission_time','end','start','submitted_at','submissiondate','submissionDate',
                  'case_id','caseNumber','_id','kobo_case_id','kobo_caseNumber','kobo__id']
    for field in candidates:
        if body.get(field) is not None and raw.get(field) is None:
            raw[field] = body.get(field)
    roster_aliases = ['family_roster','family','roster','household','household_members','members','family_members','familymembers','householdMembers']
    for alias in roster_aliases:
        if body.get(alias) is not None and raw.get(alias) is None:
            raw[alias] = body.get(alias)
    if body.get('formFields') is not None and raw.get('formFields') is None:
        raw['formFields'] = body.get('formFields')
    category_aliases = ['law_followup','eng_followup','category','case_category','caseCategory','law_followup1','law_followup3','law_followup4','law_followup5']
    for alias in category_aliases:
        if body.get(alias) is not None and raw.get(alias) is None:
            raw[alias] = body.get(alias)
    return raw


def apply_backfill(session: Session, dry_run: bool = True) -> int:
    """Apply the promotion migration to existing Case.raw values. Returns count of modified rows."""
    cases = session.query(Case).all()
    modified = 0
    for c in cases:
        if not c.raw or not isinstance(c.raw, dict):
            continue
        body = c.raw.get('body')
        if not isinstance(body, dict) and not isinstance(body, str):
            continue
        new_raw = promote_body_to_raw(dict(c.raw))
        # If promotion changed anything (i.e., new keys present that weren't before)
        if new_raw != c.raw:
            modified += 1
            if dry_run:
                logging.info('Would modify case id=%s', c.id)
            else:
                c.raw = new_raw
                session.add(c)
    if not dry_run:
        session.commit()
    return modified


def rollback_backfill(session: Session) -> int:
    """Rollback previously applied backfill by copying `_body_backup` back into `body` and removing promoted keys listed above.
    Returns number of rows restored.
    """
    cases = session.query(Case).all()
    restored = 0
    fields_to_remove = ['_submission_time','submissiontime','submission_time','end','start','submitted_at','submissiondate','submissionDate',
                        'case_id','caseNumber','_id','kobo_case_id','kobo_caseNumber','kobo__id','family','formFields','family_roster','roster','household','household_members','members','family_members','familymembers','householdMembers','law_followup','eng_followup','category','case_category','caseCategory','law_followup1','law_followup3','law_followup4','law_followup5']
    for c in cases:
        if not c.raw or not isinstance(c.raw, dict):
            continue
        if '_body_backup' in c.raw and isinstance(c.raw['_body_backup'], dict):
            # restore
            orig_body = dict(c.raw['_body_backup'])
            # remove promoted fields
            for f in fields_to_remove:
                c.raw.pop(f, None)
            c.raw['body'] = orig_body
            c.raw.pop('_body_backup', None)
            session.add(c)
            restored += 1
    session.commit()
    return restored


def main():
    parser = argparse.ArgumentParser(description='Promote nested raw.body fields into top-level raw for existing cases')
    parser.add_argument('--apply', action='store_true', help='Actually write changes (default is dry-run)')
    parser.add_argument('--rollback', action='store_true', help='Rollback changes using _body_backup')
    args = parser.parse_args()
    session = SessionLocal()
    # If using sqlite and running this script for the first time in a local dev env, create tables to allow the script to proceed.
    db_url = os.environ.get('DATABASE_URL', '')
    if db_url.startswith('sqlite'):
        Base.metadata.create_all(bind=api_module.engine)

    if args.rollback:
        n = rollback_backfill(session)
        print(f'Restored {n} cases from _body_backup')
        return
    n = apply_backfill(session, dry_run=not args.apply)
    if args.apply:
        print(f'Applied promotion on {n} cases')
    else:
        print(f'Dry-run: {n} cases would be modified')


if __name__ == '__main__':
    main()
