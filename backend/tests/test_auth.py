def test_register_weak_password_rejected(client):
    # Too weak password should be rejected
    payload = {
        'username': 'weakuser',
        'email': 'weak@example.com',
        'password': 'weak'
    }
    res = client.post('/auth/register', json=payload)
    assert res.status_code == 400


def test_register_strong_password_allowed_and_must_change_flag(client):
    payload = {
        'username': 'stronguser',
        'email': 'strong@example.com',
        'password': 'Astrong1!',
        'must_change_password': True
    }
    res = client.post('/auth/register', json=payload)
    assert res.status_code == 200
    body = res.json()
    assert 'token' in body
    assert 'user' in body and body['user'].get('must_change_password') == True
