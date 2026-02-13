import requests
import json

try:
    # Need to login first or is it protected? @login_required is there.
    # So I need session.
    # Actually, let's just check if it returns 404 or 401/403 (which means it exists).
    # 404 means missing.
    resp = requests.post('http://localhost:5000/api/simulate_scenario', json={'scenario': 'test'})
    print(f"Status Code: {resp.status_code}")
    if resp.status_code == 404:
        print("FAIL: Endpoint not found")
    elif resp.status_code == 401: # Unauthorized
        print("PASS: Endpoint exists (Auth required)")
    else:
        print(f"Response: {resp.text[:100]}")
except Exception as e:
    print(f"Error: {e}")
