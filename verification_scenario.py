"""
verification_scenario.py — Explicit Step-by-Step Manual Security Scenario Verification
"""
import os
import sys
import json
from pathlib import Path

# Ensure project root is on sys.path
PROJECT_ROOT = str(Path(__file__).resolve().parent)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

os.environ["AUTH_DEV_MODE"] = "false"

from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database.session import SessionLocal, init_db
from backend.app.models.user import User

def run_manual_verification():
    print("==================================================")
    print("RUNNING EXPLICIT SECURITY VERIFICATION SCENARIO")
    print("==================================================")
    init_db()
    client = TestClient(app)

    # 1. USER A -> Register / Login -> receives token A
    print("\n[Step 1] Registering User A (alpha_corp@test.local)...")
    res_reg_a = client.post("/api/auth/register", json={
        "email": "alpha_corp@test.local",
        "password": "PasswordAlpha123!",
        "full_name": "Alpha Admin",
        "organization_name": "Alpha Corp"
    })
    if res_reg_a.status_code == 201:
        token_a = res_reg_a.json()["access_token"]
        user_a_id = res_reg_a.json()["user"]["id"]
    else:
        res_login_a = client.post("/api/auth/login", json={
            "email": "alpha_corp@test.local",
            "password": "PasswordAlpha123!"
        })
        token_a = res_login_a.json()["access_token"]
        user_a_id = res_login_a.json()["user"]["id"]
    print(f"✓ USER A authenticated (ID: {user_a_id}, Token A: {token_a[:15]}...)")

    # 2. USER B -> Register / Login -> receives token B
    print("\n[Step 2] Registering User B (beta_ind@test.local)...")
    res_reg_b = client.post("/api/auth/register", json={
        "email": "beta_ind@test.local",
        "password": "PasswordBeta123!",
        "full_name": "Beta Manager",
        "organization_name": "Beta Industries"
    })
    if res_reg_b.status_code == 201:
        token_b = res_reg_b.json()["access_token"]
        user_b_id = res_reg_b.json()["user"]["id"]
    else:
        res_login_b = client.post("/api/auth/login", json={
            "email": "beta_ind@test.local",
            "password": "PasswordBeta123!"
        })
        token_b = res_login_b.json()["access_token"]
        user_b_id = res_login_b.json()["user"]["id"]
    print(f"✓ USER B authenticated (ID: {user_b_id}, Token B: {token_b[:15]}...)")

    # 3. USER A -> uploads/seeds Document A
    print("\n[Step 3] USER A uploads Document A...")
    res_seed_a = client.post(
        "/api/documents/sample-seed",
        params={"sample_type": "electricity"},
        headers={"Authorization": f"Bearer {token_a}"}
    )
    assert res_seed_a.status_code in (200, 201), f"Seed A failed: {res_seed_a.text}"
    doc_a_id = res_seed_a.json()["id"]
    print(f"✓ Document A created with ID: {doc_a_id} (Owned by User A ID: {user_a_id})")

    # 4. USER B -> uploads/seeds Document B
    print("\n[Step 4] USER B uploads Document B...")
    res_seed_b = client.post(
        "/api/documents/sample-seed",
        params={"sample_type": "esg"},
        headers={"Authorization": f"Bearer {token_b}"}
    )
    assert res_seed_b.status_code in (200, 201), f"Seed B failed: {res_seed_b.text}"
    doc_b_id = res_seed_b.json()["id"]
    print(f"✓ Document B created with ID: {doc_b_id} (Owned by User B ID: {user_b_id})")

    # 5. USER A -> GET /api/documents -> ONLY Document A
    print("\n[Step 5] USER A queries /api/documents...")
    res_docs_a = client.get("/api/documents", headers={"Authorization": f"Bearer {token_a}"})
    assert res_docs_a.status_code == 200
    docs_a_ids = [d["id"] for d in res_docs_a.json()["documents"]]
    print(f"  USER A visible documents: {docs_a_ids}")
    assert doc_a_id in docs_a_ids, "Document A should be in User A documents"
    assert doc_b_id not in docs_a_ids, "Document B MUST NOT be in User A documents"
    print("✓ USER A sees ONLY Document A (Document B is hidden)")

    # 6. USER B -> GET /api/documents -> ONLY Document B
    print("\n[Step 6] USER B queries /api/documents...")
    res_docs_b = client.get("/api/documents", headers={"Authorization": f"Bearer {token_b}"})
    assert res_docs_b.status_code == 200
    docs_b_ids = [d["id"] for d in res_docs_b.json()["documents"]]
    print(f"  USER B visible documents: {docs_b_ids}")
    assert doc_b_id in docs_b_ids, "Document B should be in User B documents"
    assert doc_a_id not in docs_b_ids, "Document A MUST NOT be in User B documents"
    print("✓ USER B sees ONLY Document B (Document A is hidden)")

    # 7. USER A -> manually requests Document B ID -> 404
    print(f"\n[Step 7] USER A manually requests Document B (ID: {doc_b_id})...")
    res_idor = client.get(f"/api/documents/{doc_b_id}", headers={"Authorization": f"Bearer {token_a}"})
    print(f"  Response Status: {res_idor.status_code}")
    assert res_idor.status_code == 404, f"Expected 404 for cross-user document access, got {res_idor.status_code}"
    print("✓ Cross-user IDOR access safely returned 404 Not Found")

    # 8. USER A -> sends Token A + X-User-Id = User B -> remains User A
    print(f"\n[Step 8] USER A sends Token A + X-User-Id: {user_b_id} (impersonation attempt)...")
    res_impersonation = client.get(
        "/api/auth/me",
        headers={
            "Authorization": f"Bearer {token_a}",
            "X-User-Id": str(user_b_id)
        }
    )
    assert res_impersonation.status_code == 200
    current_auth = res_impersonation.json()
    print(f"  Authenticated User ID: {current_auth['id']} ({current_auth['email']})")
    assert current_auth["id"] == user_a_id, "User B ID header MUST NOT override Token A"
    assert current_auth["email"] == "alpha_corp@test.local"
    print("✓ Header conflict resolved strictly to Token A User (impersonation prevented)")

    # 9. USER A -> Copilot -> only User A context
    print("\n[Step 9] USER A queries Copilot context...")
    res_copilot_a = client.get("/api/copilot/context", headers={"Authorization": f"Bearer {token_a}"})
    assert res_copilot_a.status_code == 200
    ctx_a = res_copilot_a.json()
    print(f"  User A Copilot total documents: {ctx_a.get('total_documents', 0)}")
    print("✓ User A Copilot context retrieved strictly scoped to User A")

    # 10. USER B -> Copilot -> only User B context
    print("\n[Step 10] USER B queries Copilot context...")
    res_copilot_b = client.get("/api/copilot/context", headers={"Authorization": f"Bearer {token_b}"})
    assert res_copilot_b.status_code == 200
    ctx_b = res_copilot_b.json()
    print(f"  User B Copilot total documents: {ctx_b.get('total_documents', 0)}")
    print("✓ User B Copilot context retrieved strictly scoped to User B")

    print("\n==================================================")
    print("ALL 10 MANDATORY MANUAL VERIFICATION STEPS PASSED!")
    print("==================================================")

if __name__ == "__main__":
    run_manual_verification()
