import pytest
from backend.models import Case


def test_sensitive_raw_fields_hidden_for_non_admin(client):
    # create admin and user
    admin_payload = {'username': 'adminuser', 'email': 'adm@example.com', 'password': 'Admin123!', 'role': 'admin'}
    user_payload = {'username': 'normaluser', 'email': 'user@example.com', 'password': 'User123!'}
    res_admin = client.post('/auth/register', json=admin_payload)
    assert res_admin.status_code == 200
    admin_token = res_admin.json()['token']
    res_user = client.post('/auth/register', json=user_payload)
    assert res_user.status_code == 200
    user_token = res_user.json()['token']
    headers_admin = {'Authorization': f'Bearer {admin_token}'}
    headers_user = {'Authorization': f'Bearer {user_token}'}

    # Create a case directly via API as admin that includes sensitive fields in raw
    raw = {'id_card_nu': '12345', 'family_card_nu': '444', 'passport_nu_001': 'ABC123'}
    create_body = {'title': 'Sensitive case', 'description': 'desc', 'raw': raw}
    res = client.post('/cases', json=create_body, headers=headers_admin)
    assert res.status_code == 201
    case_id = res.json()['id']

    # Non-admin query should not return sensitive fields
    res_user_cases = client.get('/cases', headers=headers_user)
    assert res_user_cases.status_code == 200
    data = res_user_cases.json()
    # Find our case
    found = None
    for c in data:
        if c.get('id') == case_id:
            found = c
            break
    assert found is not None
    assert 'id_card_nu' not in (found.get('raw') or {})
    assert 'family_card_nu' not in (found.get('raw') or {})
    assert 'passport_nu_001' not in (found.get('raw') or {})

    # Admin query should include sensitive fields
    res_admin_cases = client.get('/cases', headers=headers_admin)
    assert res_admin_cases.status_code == 200
    data_admin = res_admin_cases.json()
    admin_case = next((c for c in data_admin if c['id'] == case_id), None)
    assert admin_case is not None
    assert 'id_card_nu' in (admin_case.get('raw') or {})
    assert 'family_card_nu' in (admin_case.get('raw') or {})
    assert ('passport_nu_001' in (admin_case.get('raw') or {})) or ('passaport_nu_001' in (admin_case.get('raw') or {}))
