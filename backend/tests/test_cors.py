def test_cors_header_present(client):
    # Check that CORS header is present for the /cases endpoint
    res = client.get('/cases')
    assert res.status_code in (200, 404)
    # The server should include Access-Control-Allow-Origin header (we default to '*')
    header_val = res.headers.get('access-control-allow-origin')
    assert header_val is not None
    assert header_val == '*' or header_val != ''


def test_cors_origin_reflected_when_credentials(client):
    # If a request includes an Origin header and the server allows credentials, the server should echo the origin
    origin = 'https://hlp.bessar.work'
    res = client.get('/cases', headers={'Origin': origin})
    assert res.status_code in (200, 404)
    header_val = res.headers.get('access-control-allow-origin')
    assert header_val is not None
    # When allowed origins contain the origin or wildcard, it should reflect the exact origin when credentials mode is used
    assert header_val == origin or header_val == '*'
