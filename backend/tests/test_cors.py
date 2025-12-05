def test_cors_header_present(client):
    # Check that CORS header is present for the /cases endpoint
    res = client.get('/cases')
    assert res.status_code in (200, 404)
    # The server should include Access-Control-Allow-Origin header (we default to '*')
    header_val = res.headers.get('access-control-allow-origin')
    assert header_val is not None
    assert header_val == '*' or header_val != ''
