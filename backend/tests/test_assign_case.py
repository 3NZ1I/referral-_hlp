def test_assign_external_user_and_sync(client):
    # create admin
    payload = {'username': 'assigner', 'email': 'assigner@example.com', 'password': 'Assign123!'}
    res = client.post('/auth/register', json=payload)
    assert res.status_code == 200
    token = res.json()['token']
    headers = {'Authorization': f'Bearer {token}'}

    # Create a case
    create = {'title': 'Assign Test Case', 'description': 'desc'}
    res_case = client.post('/cases', json=create, headers=headers)
    assert res_case.status_code == 201
    case_id = res_case.json()['id']

    # Assign to an external user (not in DB)
    assign_payload = {'user': 'external-staff', 'ability': 'external'}
    res_assign = client.post(f'/cases/{case_id}/assign', json=assign_payload, headers=headers)
    assert res_assign.status_code == 200
    assigned_case = res_assign.json()
    assert assigned_case.get('assigned_to') is not None
    assert assigned_case['assigned_to']['name'] == 'external-staff'

    # Fetch cases and confirm assignment is visible
    res_cases = client.get('/cases', headers=headers)
    assert res_cases.status_code == 200
    found = next((c for c in res_cases.json() if c['id'] == case_id), None)
    assert found is not None
    assert found.get('assigned_to', {}).get('name') == 'external-staff'
