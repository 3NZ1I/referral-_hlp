def test_create_case_promotes_submission_and_roster(client):
    # Register admin user and get a token
    res = client.post('/auth/register', json={
        'username': 'admin_roster',
        'email': 'admin_roster@example.com',
        'password': 'Adm1nPass!',
        'role': 'admin'
    })
    assert res.status_code == 200
    admin_token = res.json()['token']
    headers = {'Authorization': f'Bearer {admin_token}'}

    payload = {
        'title': 'Test Roster Submission',
        'description': 'Testing nested body promotion',
        'raw': {
            'headers': {'x': 'y'},
            'body': {
                'end': '2025-11-01 09:00:00',
                'group_fj2tt69_partnernu1_1_partner_name': 'Jane Doe',
                'group_fj2tt69_partnernu1_1_partner_lastname': 'Doe'
            },
            'kobo_case_id': 'kobo-98765'
        }
    }
    r = client.post('/cases', json=payload, headers=headers)
    assert r.status_code == 201
    b = r.json()
    # Top-level raw should contain roster fields and a canonical _submission_time
    assert b['raw'].get('_submission_time') is not None
    assert 'group_fj2tt69_partnernu1_1_partner_name' in b['raw']
    assert b['raw']['group_fj2tt69_partnernu1_1_partner_name'] == 'Jane Doe'

def test_update_case_with_nested_body_promotes_fields(client):
    res = client.post('/auth/register', json={
        'username': 'admin_update',
        'email': 'admin_update@example.com',
        'password': 'Updat3P@ss',
        'role': 'admin'
    })
    assert res.status_code == 200
    token = res.json()['token']
    headers = {'Authorization': f'Bearer {token}'}

    # Create an empty case
    create_res = client.post('/cases', json={'title': 'UpdatePromoteTest', 'raw': {}}, headers=headers)
    assert create_res.status_code == 201
    case_id = create_res.json()['id']

    # Update with nested body
    upd_payload = {
        'raw': {
            'body': {
                'start': 1700000000,
                'group_fj2tt69_partnernu1_1_partner_name': 'Updated Name'
            }
        }
    }
    u = client.put(f'/cases/{case_id}', json=upd_payload, headers=headers)
    assert u.status_code == 200
    updated = u.json()
    assert updated['raw'].get('_submission_time') is not None
    assert updated['raw'].get('group_fj2tt69_partnernu1_1_partner_name') == 'Updated Name'
