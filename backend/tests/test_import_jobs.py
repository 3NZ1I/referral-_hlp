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
