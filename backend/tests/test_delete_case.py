def test_delete_case_with_comments_and_import_rows(client):
    # Register admin and create case
    # Use the seeded admin user to perform delete (admin seeded at startup)
    res_login = client.post('/auth/login', json={'username': 'admin', 'password': 'admin123'})
    assert res_login.status_code == 200
    token = res_login.json().get('token')
    headers = {'Authorization': f'Bearer {token}'}

    create = {'title': 'Delete Test Case', 'description': 'desc'}
    res_case = client.post('/cases', json=create, headers=headers)
    assert res_case.status_code == 201
    case_id = res_case.json()['id']

    # Add a comment
    comment_res = client.post(f'/cases/{case_id}/comments', json={'content': 'test comment'}, headers=headers)
    assert comment_res.status_code == 201

    # Create an import job and import_row linked to this case (use backend DB session)
    from backend import api
    from backend.models import ImportJob, ImportRow
    db = api.SessionLocal()
    job = ImportJob(uploader_name='test', filename='fake.xlsx')
    db.add(job)
    db.commit()
    db.refresh(job)
    row = ImportRow(job_id=job.id, row_number=1, raw={'case_id': 'abc'}, case_id=case_id, status='success')
    db.add(row)
    db.commit()
    db.refresh(row)
    db.close()

    # Now delete the case
    res_del = client.delete(f'/cases/{case_id}', headers=headers)
    assert res_del.status_code == 200
    # Ensure case no longer exists
    res_get = client.get(f'/cases/{case_id}', headers=headers)
    assert res_get.status_code == 404

    # Verify import row has been updated to have no case_id
    db2 = api.SessionLocal()
    rr = db2.query(ImportRow).filter(ImportRow.id == row.id).first()
    assert rr is not None
    assert rr.case_id is None
    db2.close()
