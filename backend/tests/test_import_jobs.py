import io
from openpyxl import Workbook


def workbook_bytes(headers, rows):
    wb = Workbook()
    ws = wb.active
    ws.append(headers)
    for r in rows:
        ws.append(r)
    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)
    return stream


def test_import_job_and_retry(client):
    # create user
    payload = {'username': 'importer', 'email': 'importer@example.com', 'password': 'Import123!'}
    res = client.post('/auth/register', json=payload)
    assert res.status_code == 200
    token = res.json()['token']
    headers = {'Authorization': f'Bearer {token}'}

    # prepare a workbook with 2 rows, the second one will be intentionally malformed
    headers_row = ['Title', 'Description']
    rows = [['Ok', 'dr1'], ['Bad', None]]
    stream = workbook_bytes(headers_row, rows)
    files = {'file': ('test.xlsx', stream, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
    res = client.post('/import', headers=headers, files=files)
    assert res.status_code == 200
    body = res.json()
    assert 'job_id' in body
    job_id = body['job_id']

    # get job details
    job_res = client.get(f'/import/jobs/{job_id}', headers=headers)
    assert job_res.status_code == 200
    job_data = job_res.json()
    assert 'rows' in job_data
    assert len(job_data['rows']) >= 1


def test_import_job_sensitive_fields_hidden_for_non_admin(client):
    # Create a user and upload a file containing sensitive fields
    payload = {'username': 'importer2', 'email': 'importer2@example.com', 'password': 'Import123!'}
    res = client.post('/auth/register', json=payload)
    token = res.json()['token']
    headers = {'Authorization': f'Bearer {token}'}

    headers_row = ['id_card_nu', 'Title']
    rows = [['SENSITIVE-ID-999', 'Case with sensitive info']]
    stream = workbook_bytes(headers_row, rows)
    files = {'file': ('test_privacy.xlsx', stream, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
    res = client.post('/import', headers=headers, files=files)
    assert res.status_code == 200
    body = res.json()
    job_id = body['job_id']

    # non-admin fetch of job should hide sensitive raw fields
    res_job = client.get(f'/import/jobs/{job_id}')
    assert res_job.status_code == 200
    job_data = res_job.json()
    assert 'rows' in job_data
    assert len(job_data['rows']) > 0
    for r in job_data['rows']:
        assert 'id_card_nu' not in (r.get('raw') or {})

    # admin fetch of job should include sensitive fields
    admin_payload = {'username': 'admin2', 'email': 'admin2@example.com', 'password': 'Admin123!', 'role': 'admin'}
    res_admin = client.post('/auth/register', json=admin_payload)
    admin_token = res_admin.json()['token']
    headers_admin = {'Authorization': f'Bearer {admin_token}'}
    res_job_admin = client.get(f'/import/jobs/{job_id}', headers=headers_admin)
    assert res_job_admin.status_code == 200
    job_admin = res_job_admin.json()
    assert any('id_card_nu' in (r.get('raw') or {}) for r in job_admin['rows'])
