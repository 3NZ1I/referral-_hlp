def test_generate_token_admin(client):
    # Register admin user and generate token via new endpoint
    admin_username = 'gen_admin'
    res = client.post('/auth/register', json={
        'username': admin_username,
        'email': 'gen_admin@example.com',
        'password': 'Passw0rd!',
        'role': 'admin',
    })
    assert res.status_code == 200
    admin_token = res.json()['token']

    headers = {'Authorization': f'Bearer {admin_token}'}
    payload = {'sub': 'n8n', 'role': 'system', 'exp_minutes': 60}
    r = client.post('/auth/generate', json=payload, headers=headers)
    assert r.status_code == 200
    body = r.json()
    assert 'token' in body
    assert 'expires_in_minutes' in body
    # Verify token contains expected claims
    import jwt
    token_payload = jwt.decode(body['token'], options={"verify_signature": False})
    assert token_payload.get('sub') == 'n8n'
    assert token_payload.get('role') == 'system'

def test_generate_token_non_admin_forbidden(client):
    # Register normal user
    user_res = client.post('/auth/register', json={
        'username': 'gen_user',
        'email': 'gen_user@example.com',
        'password': 'Passw0rd!',
        'role': 'user'
    })
    assert user_res.status_code == 200
    user_token = user_res.json()['token']
    headers = {'Authorization': f'Bearer {user_token}'}
    r = client.post('/auth/generate', json={'sub': 'n8n'}, headers=headers)
    assert r.status_code in (401, 403)
