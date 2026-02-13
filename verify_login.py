import sys
import os

# Add project root to path
sys.path.append(r'c:\Users\emadu\Ks')

from hydra_analyzer import app

def test_login_flow():
    client = app.test_client()
    app.config['WTF_CSRF_ENABLED'] = False # Disable CSRF for testing if it was enabled (not in this case but good practice)

    print("1. Testing Unauthorized Access to Dashboard...")
    response = client.get('/', follow_redirects=True)
    if response.request.path == '/login':
        print("   PASS: Redirected to /login")
    else:
        print(f"   FAIL: Expected /login, got {response.request.path}")

    print("\n2. Testing Valid Login...")
    response = client.post('/login', data={'username': 'admin', 'password': 'admin'}, follow_redirects=True)
    if response.request.path == '/':
        print("   PASS: Logged in successfully, redirected to /")
    else:
        print(f"   FAIL: Expected /, got {response.request.path}")

    print("\n3. Testing Logout...")
    response = client.get('/logout', follow_redirects=True)
    if response.request.path == '/login':
        print("   PASS: Logged out successfully, redirected to /login")
    else:
        print(f"   FAIL: Expected /login, got {response.request.path}")

    print("\n4. Testing Invalid Login...")
    response = client.post('/login', data={'username': 'admin', 'password': 'wrongpassword'}, follow_redirects=True)
    if b'Access Denied' in response.data:
         print("   PASS: Error message displayed")
    else:
         print("   FAIL: Error message not found")

if __name__ == "__main__":
    test_login_flow()
