from backend.schemas import UserRead


def test_user_read_allows_reserved_domain():
    # Directly instantiate the response schema with a reserved domain and ensure it validates
    u = UserRead(id=1, username='reserved_admin', email='admin@hlp.local', name='Reserved Admin', created_at=None)
    assert u.email == 'admin@hlp.local'
    # Ensure serialization to dict doesn't raise Pydantic validation error
    d = u.dict()
    assert d['email'] == 'admin@hlp.local'
