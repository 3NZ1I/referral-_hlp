def test_get_cases_returns_flattened_raw(client):
    # Create an admin to post a wrapped payload
    res = client.post('/auth/register', json={
        'username': 'flat_admin',
        'email': 'flat_admin@example.com',
        'password': 'AdminPassw0rd!',
        'role': 'admin'
    })
    assert res.status_code == 200
    token = res.json()['token']
    headers = {'Authorization': f'Bearer {token}'}

    # Create case with nested body wrapper
    payload = {
        'title': 'Wrapped test',
        'raw': {
            'headers': { 'x': 'y' },
            'body': {
                'group_fj2tt69_partnernu1_1_partner_name': 'Flat Name',
                'submissiontime': '2025-11-01 12:00:00'
            }
        }
    }
    c = client.post('/cases', json=payload, headers=headers)
    assert c.status_code == 201
    all_cases = client.get('/cases', headers=headers)
    assert all_cases.status_code == 200
    data = all_cases.json()
    # Find the created case, confirm raw contains promoted fields
    found = None
    for item in data:
        if item.get('title') == 'Wrapped test':
            found = item
            break
    assert found is not None
    assert found['raw'].get('_submission_time') is not None or found['raw'].get('submissiontime') is not None
    assert found['raw'].get('group_fj2tt69_partnernu1_1_partner_name') == 'Flat Name'
