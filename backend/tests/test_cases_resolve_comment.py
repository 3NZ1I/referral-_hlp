def test_resolve_comment_required_for_status_change(client):
    # Create/register a user
    payload = {
        'username': 'caseuser',
        'email': 'case@example.com',
        'password': 'StrongPass1!'
    }
    res = client.post('/auth/register', json=payload)
    assert res.status_code == 200
    token = res.json()['token']
    headers = {'Authorization': f'Bearer {token}'}

    # Create a case
    case_payload = {'title': 'Test Case', 'description': 'Some desc'}
    create_res = client.post('/cases', json=case_payload, headers=headers)
    assert create_res.status_code == 201
    case_id = create_res.json()['id']

    # Try updating status to Completed without resolve_comment -> should fail
    update_res = client.put(f'/cases/{case_id}', json={'status': 'Completed'}, headers=headers)
    assert update_res.status_code == 400

    # Update with resolve_comment -> success
    update_res_success = client.put(f'/cases/{case_id}', json={'status': 'Completed', 'resolve_comment': 'Case closed and resolved'}, headers=headers)
    assert update_res_success.status_code == 200
