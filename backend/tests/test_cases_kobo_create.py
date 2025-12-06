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
