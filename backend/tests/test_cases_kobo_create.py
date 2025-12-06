def test_create_case_from_kobo_sets_title(client):
    # Register a new internal service user and get token via register
    payload = {'username': 'svcuser', 'email': 'svc@example.com', 'password': 'StrongPass1!'}
    res_reg = client.post('/auth/register', json=payload)
    assert res_reg.status_code == 200
    token = res_reg.json().get('token')
    assert token

    headers = {'Authorization': f'Bearer {token}'}
    # Provide a payload that uses the default title but raw contains case_number
    kobo_payload = {
        'title': 'Kobo Submission',
        'description': 'Test create via n8n',
        'raw': {
            'body': {'case_number': 'SYR-TEST-001'},
            '_uuid': 'test-uuid-kk',
            'kobo_case_id': 'kobo-123'
        }
    }
    res = client.post('/cases', json=kobo_payload, headers=headers)
    assert res.status_code == 201
    body = res.json()
    assert body.get('title') == 'SYR-TEST-001', f"Expected title to be case number, got: {body}"

def test_delete_case_created_by_kobo(client):
    # Register admin user and login
    # If admin already exists, login will work; otherwise, register
    admin_reg = client.post('/auth/register', json={'username': 'admin2', 'email': 'admin2@example.com', 'password': 'AdminPass1!','role':'admin'})
    admin_token = admin_reg.json().get('token') if admin_reg.status_code == 200 else None
    if not admin_token:
        # If register failed due to user exists, login
        res_login = client.post('/auth/login', json={'username': 'admin', 'password': 'admin123'})
        admin_token = res_login.json().get('token')
    assert admin_token
    headers = {'Authorization': f'Bearer {admin_token}'}

    # Create a case then delete it
    kobo_payload = {
        'title': 'Kobo Submission',
        'description': 'To delete',
        'raw': {'_uuid': 'delete-uuid-1', 'kobo_case_id': 'k-111'}
    }
    res = client.post('/cases', json=kobo_payload, headers=headers)
    assert res.status_code == 201
    case_id = res.json().get('id')
    # Delete
    del_res = client.delete(f'/cases/{case_id}', headers=headers)
    assert del_res.status_code == 200


def test_create_case_moves_submission_time_to_top_level(client):
    # Register a new internal service user and get token via register
    payload = {'username': 'svcuser2', 'email': 'svc2@example.com', 'password': 'StrongPass1!'}
    res_reg = client.post('/auth/register', json=payload)
    assert res_reg.status_code == 200
    token = res_reg.json().get('token')
    assert token
    headers = {'Authorization': f'Bearer {token}'}

    # 1) Test when payload has nested raw.body._submission_time
    kobo_payload = {
        'title': 'Kobo Submission',
        'description': 'Check submission time moved',
        'raw': {
            'body': {'case_number': 'TEST-TS-01', '_submission_time': '2024-01-01T12:00:00Z'},
            '_uuid': 'ts-uuid-1'
        }
    }
    res = client.post('/cases', json=kobo_payload, headers=headers)
    assert res.status_code == 201
    body = res.json()
    assert 'raw' in body and isinstance(body['raw'], dict)
    assert body['raw'].get('_submission_time') == '2024-01-01T12:00:00Z'

    # 2) Test when payload is wrapper style with headers/body
    wrapper_payload = {
        'title': 'Kobo Submission',
        'raw': {
            'headers': {'source': 'kobo'},
            'body': {'case_number': 'TEST-TS-02', 'submissiontime': '2024-01-02T14:00:00Z'}
        }
    }
    res2 = client.post('/cases', json=wrapper_payload, headers=headers)
    assert res2.status_code == 201
    body2 = res2.json()
    assert 'raw' in body2 and isinstance(body2['raw'], dict)
    assert body2['raw'].get('submissiontime') == '2024-01-02T14:00:00Z'

    # 3) Test numeric epoch seconds (10-digit) in nested raw.body
    epoch_payload = {
        'title': 'Kobo Submission',
        'raw': {
            'body': {'case_number': 'TEST-TS-03', '_submission_time': 1704067200},  # 2024-01-01T00:00:00Z
            '_uuid': 'ts-uuid-2'
        }
    }
    res3 = client.post('/cases', json=epoch_payload, headers=headers)
    assert res3.status_code == 201
    body3 = res3.json()
    assert body3['raw'].get('_submission_time') == '2024-01-01T00:00:00Z'

    # 4) Test space-separated datetime string and ensure we convert to ISO
    spaced_payload = {
        'title': 'Kobo Submission',
        'raw': {
            'body': {'case_number': 'TEST-TS-04', '_submission_time': '2024-01-03 08:30:00'},
            '_uuid': 'ts-uuid-3'
        }
    }
    res4 = client.post('/cases', json=spaced_payload, headers=headers)
    assert res4.status_code == 201
    body4 = res4.json()
    assert body4['raw'].get('_submission_time') == '2024-01-03T08:30:00Z'

def test_create_case_promotes_family_to_formfields(client):
    payload = {'username': 'svcuserfam', 'email': 'svcfam@example.com', 'password': 'StrongPass1!'}
    res_reg = client.post('/auth/register', json=payload)
    token = res_reg.json().get('token')
    headers = {'Authorization': f'Bearer {token}'}
    # nested payload with family
    kobo_payload = {
        'title': 'Kobo Family',
        'raw': {
            'body': {
                'family': [{'name': 'Member1', 'relation': 'child'}],
                'caseNumber': 'FAM-001',
                '_submission_time': '2024-04-01T10:00:00Z',
                'category': 'law_followup4'
            },
            '_uuid': 'fam-uuid-1'
        }
    }
    res = client.post('/cases', json=kobo_payload, headers=headers)
    assert res.status_code == 201
    created = res.json()
    assert created['raw'].get('caseNumber') == 'FAM-001'
    assert created['raw'].get('_submission_time') == '2024-04-01T10:00:00Z'
    # GET /cases should show formFields.family promoted
    all_cases = client.get('/cases', headers=headers).json()
    found = None
    for item in all_cases:
        if item['title'] == 'Kobo Family':
            found = item
            break
    assert found is not None
    assert 'formFields' in found['raw'] and found['raw']['formFields'].get('family') is not None
    # Category promotion
    assert found['raw'].get('category') == 'law_followup4'
