import httpx, openpyxl, traceback
from openpyxl import Workbook
wb = Workbook()
ws = wb.active
ws.append(['case_id', 'Title', 'description', 'beneficiary_name', 'today'])
ws.append(['EXT-002','Test Case 2','desc2','Bob','2025-11-28'])
wb.save('test_upload2.xlsx')

base = 'http://127.0.0.1:8002'
client = httpx.Client()
try:
    res = client.post(base + '/auth/login', json={'username': 'admin', 'password': 'admin123'})
    print('login status', res.status_code, res.text)
    res.raise_for_status()
    token = res.json()['token']
    headers = {'Authorization': f'Bearer {token}'}
    files = {'file': ('test_upload2.xlsx', open('test_upload2.xlsx','rb'), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
    res = client.post(base + '/import', headers=headers, files=files, timeout=30)
    print('import status', res.status_code, res.text)
except Exception as e:
    print('Exception during test', e)
    traceback.print_exc()
