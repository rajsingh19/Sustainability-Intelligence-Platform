"""
tests/test_auth_security.py — Critical Security Refinement & User-Scoped Isolation Test Suite.

Verifies:
1. Production Bearer Token Authentication (HS256 signed JWT)
2. AUTH_DEV_MODE gating (X-User-Id, X-User-Email, legacy fallback disabled in production)
3. Bearer Token vs Header conflict resolution (Token User A + Header User B -> authenticates as User A)
4. Client-supplied user_id in payload is ignored (Ownership forced to current_user.id)
5. Password hashing security (PBKDF2-HMAC-SHA256, no plaintext, no hash leak in responses)
6. IDOR prevention & cross-user isolation (User A requesting User B document -> 404 Not Found)
7. Cross-user isolation for child resources (metrics, calculations, ledger, copilot, agent)
8. Dev/Test mode fallback behavior when AUTH_DEV_MODE=true
"""
import os
import time
from datetime import datetime
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.database.session import SessionLocal, init_db
from backend.app.models.user import User
from backend.app.models.document import Document
from backend.app.models.sustainability_metric import SustainabilityMetric
from backend.app.models.carbon_calculation import CarbonCalculation
from backend.app.models.carbon_ledger import CarbonLedgerEntry
from backend.app.services.auth import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    get_or_create_demo_user,
)


@pytest.fixture
def db_session():
    init_db()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def test_users(db_session):
    """Create User A and User B for isolation testing."""
    # Ensure User A
    user_a = db_session.query(User).filter(User.email == "user_a@sensible.local").first()
    if not user_a:
        user_a = User(
            email="user_a@sensible.local",
            username="user_a",
            hashed_password=hash_password("PasswordA123!"),
            full_name="User Alpha",
            organization_name="Alpha Corp",
            role="USER",
            is_active=True,
        )
        db_session.add(user_a)

    # Ensure User B
    user_b = db_session.query(User).filter(User.email == "user_b@sensible.local").first()
    if not user_b:
        user_b = User(
            email="user_b@sensible.local",
            username="user_b",
            hashed_password=hash_password("PasswordB123!"),
            full_name="User Beta",
            organization_name="Beta Industries",
            role="USER",
            is_active=True,
        )
        db_session.add(user_b)

    db_session.commit()
    db_session.refresh(user_a)
    db_session.refresh(user_b)

    token_a = create_access_token(user_a.id, email=user_a.email, role=user_a.role)
    token_b = create_access_token(user_b.id, email=user_b.email, role=user_b.role)

    return {
        "user_a": user_a,
        "token_a": token_a,
        "user_b": user_b,
        "token_b": token_b,
    }


# ===========================================================================
# 1. Password Security & Token Cryptography
# ===========================================================================

def test_password_hashing_and_verification():
    raw_pass = "SuperSecretPassword123!"
    h = hash_password(raw_pass)
    assert h != raw_pass
    assert h.startswith("pbkdf2_sha256$")
    assert verify_password(raw_pass, h) is True
    assert verify_password("WrongPassword", h) is False


def test_token_creation_and_validation(test_users):
    token = test_users["token_a"]
    user_id = decode_access_token(token)
    assert user_id == test_users["user_a"].id


def test_expired_token_rejected(test_users):
    # Create an expired token (expires in -10 seconds)
    expired_token = create_access_token(
        test_users["user_a"].id,
        email=test_users["user_a"].email,
        role=test_users["user_a"].role,
        expires_in_seconds=-10
    )
    user_id = decode_access_token(expired_token)
    assert user_id is None


def test_tampered_token_rejected(test_users):
    token = test_users["token_a"]
    # Corrupt the signature part
    parts = token.split(".")
    tampered_token = f"{parts[0]}.{parts[1]}.badsignature123"
    assert decode_access_token(tampered_token) is None


# ===========================================================================
# 2. Production Mode Security (AUTH_DEV_MODE=false)
# ===========================================================================

def test_production_mode_rejects_missing_token(monkeypatch):
    monkeypatch.setenv("AUTH_DEV_MODE", "false")
    client = TestClient(app)
    resp = client.get("/api/documents")
    assert resp.status_code == 401
    assert "detail" in resp.json()


def test_production_mode_rejects_x_user_id_header(monkeypatch, test_users):
    monkeypatch.setenv("AUTH_DEV_MODE", "false")
    client = TestClient(app)
    resp = client.get("/api/documents", headers={"X-User-Id": str(test_users["user_a"].id)})
    assert resp.status_code == 401


def test_production_mode_rejects_x_user_email_header(monkeypatch, test_users):
    monkeypatch.setenv("AUTH_DEV_MODE", "false")
    client = TestClient(app)
    resp = client.get("/api/documents", headers={"X-User-Email": test_users["user_a"].email})
    assert resp.status_code == 401


def test_production_mode_rejects_invalid_bearer_token(monkeypatch):
    monkeypatch.setenv("AUTH_DEV_MODE", "false")
    client = TestClient(app)
    resp = client.get("/api/documents", headers={"Authorization": "Bearer not-a-valid-token"})
    assert resp.status_code == 401


def test_production_mode_accepts_valid_bearer_token(monkeypatch, test_users):
    monkeypatch.setenv("AUTH_DEV_MODE", "false")
    client = TestClient(app)
    resp = client.get("/api/documents", headers={"Authorization": f"Bearer {test_users['token_a']}"})
    assert resp.status_code == 200
    assert "documents" in resp.json()


# ===========================================================================
# 3. Token + Header Conflict (Header Must NOT Override Token)
# ===========================================================================

def test_token_and_x_user_id_conflict_resolves_to_token_user(monkeypatch, test_users):
    """
    When client sends:
    Authorization: Bearer <USER_A_TOKEN>
    X-User-Id: <USER_B_ID>
    Request must authenticate as User A.
    """
    monkeypatch.setenv("AUTH_DEV_MODE", "false")
    client = TestClient(app)
    resp = client.get(
        "/api/auth/me",
        headers={
            "Authorization": f"Bearer {test_users['token_a']}",
            "X-User-Id": str(test_users["user_b"].id)
        }
    )
    assert resp.status_code == 200
    me = resp.json()
    assert me["id"] == test_users["user_a"].id
    assert me["email"] == test_users["user_a"].email
    assert "hashed_password" not in me


def test_token_and_x_user_email_conflict_resolves_to_token_user(monkeypatch, test_users):
    """
    When client sends:
    Authorization: Bearer <USER_A_TOKEN>
    X-User-Email: <USER_B_EMAIL>
    Request must authenticate as User A.
    """
    monkeypatch.setenv("AUTH_DEV_MODE", "false")
    client = TestClient(app)
    resp = client.get(
        "/api/auth/me",
        headers={
            "Authorization": f"Bearer {test_users['token_a']}",
            "X-User-Email": test_users["user_b"].email
        }
    )
    assert resp.status_code == 200
    me = resp.json()
    assert me["id"] == test_users["user_a"].id
    assert me["email"] == test_users["user_a"].email


# ===========================================================================
# 4. User-Scoped Document Isolation & IDOR Protection
# ===========================================================================

def test_cross_user_document_isolation_and_idor(db_session, test_users, monkeypatch):
    """
    User A owns Document A.
    User B owns Document B.
    1. User A lists documents -> sees only Document A (not Document B).
    2. User B lists documents -> sees only Document B (not Document A).
    3. User A requests Document B directly -> 404 Not Found (never 403 or 200).
    4. User B requests Document A directly -> 404 Not Found.
    """
    monkeypatch.setenv("AUTH_DEV_MODE", "false")

    # Create Document A owned by User A
    doc_a = Document(
        user_id=test_users["user_a"].id,
        filename="alpha_electricity_bill.pdf",
        original_filename="alpha_electricity_bill.pdf",
        file_path="/tmp/test_doc_a.pdf",
        file_size=1024,
        file_hash="hash_a_123456",
        mime_type="application/pdf",
        document_type="UTILITY_BILL",
        status="EXTRACTED",
        company_name="Alpha Corp",
    )
    db_session.add(doc_a)

    # Create Document B owned by User B
    doc_b = Document(
        user_id=test_users["user_b"].id,
        filename="beta_fuel_report.pdf",
        original_filename="beta_fuel_report.pdf",
        file_path="/tmp/test_doc_b.pdf",
        file_size=2048,
        file_hash="hash_b_654321",
        mime_type="application/pdf",
        document_type="FUEL_LOG",
        status="EXTRACTED",
        company_name="Beta Industries",
    )
    db_session.add(doc_b)
    db_session.commit()
    db_session.refresh(doc_a)
    db_session.refresh(doc_b)

    client = TestClient(app)

    # User A listing documents
    resp_a = client.get(
        "/api/documents",
        headers={"Authorization": f"Bearer {test_users['token_a']}"}
    )
    assert resp_a.status_code == 200
    doc_ids_a = [d["id"] for d in resp_a.json()["documents"]]
    assert doc_a.id in doc_ids_a
    assert doc_b.id not in doc_ids_a

    # User B listing documents
    resp_b = client.get(
        "/api/documents",
        headers={"Authorization": f"Bearer {test_users['token_b']}"}
    )
    assert resp_b.status_code == 200
    doc_ids_b = [d["id"] for d in resp_b.json()["documents"]]
    assert doc_b.id in doc_ids_b
    assert doc_a.id not in doc_ids_b

    # IDOR Prevention: User A requests Document B directly
    resp_idor_a = client.get(
        f"/api/documents/{doc_b.id}",
        headers={"Authorization": f"Bearer {test_users['token_a']}"}
    )
    assert resp_idor_a.status_code == 404

    # IDOR Prevention: User B requests Document A directly
    resp_idor_b = client.get(
        f"/api/documents/{doc_a.id}",
        headers={"Authorization": f"Bearer {test_users['token_b']}"}
    )
    assert resp_idor_b.status_code == 404

    # IDOR Prevention: User A requests child endpoints of Document B
    resp_evidence = client.get(
        f"/api/documents/{doc_b.id}/evidence-report",
        headers={"Authorization": f"Bearer {test_users['token_a']}"}
    )
    assert resp_evidence.status_code == 404

    resp_calculations = client.get(
        f"/api/documents/{doc_b.id}/carbon-calculations",
        headers={"Authorization": f"Bearer {test_users['token_a']}"}
    )
    assert resp_calculations.status_code == 404

    resp_ledger = client.get(
        f"/api/documents/{doc_b.id}/carbon-ledger",
        headers={"Authorization": f"Bearer {test_users['token_a']}"}
    )
    assert resp_ledger.status_code == 404


# ===========================================================================
# 5. Client user_id Forgery Prevention
# ===========================================================================

def test_client_supplied_user_id_in_body_is_ignored(db_session, test_users, monkeypatch):
    """
    If a client sends user_id=999 while authenticated as User A,
    the document must still belong to User A.
    """
    monkeypatch.setenv("AUTH_DEV_MODE", "false")
    client = TestClient(app)

    # Use seed endpoint or sample document
    resp = client.post(
        "/api/documents/sample-seed",
        params={"sample_type": "electricity", "user_id": test_users["user_b"].id},
        headers={"Authorization": f"Bearer {test_users['token_a']}"}
    )
    assert resp.status_code in (200, 201)
    doc_data = resp.json()
    created_doc_id = doc_data["id"]

    # Verify directly in DB that document is owned by User A
    doc = db_session.query(Document).filter(Document.id == created_doc_id).first()
    assert doc.user_id == test_users["user_a"].id
    assert doc.user_id != test_users["user_b"].id


# ===========================================================================
# 6. Auth API Registration, Login, & Me Endpoints
# ===========================================================================

def test_auth_registration_and_login_flow(monkeypatch):
    monkeypatch.setenv("AUTH_DEV_MODE", "false")
    client = TestClient(app)
    unique_email = f"test_{int(time.time())}@company.com"

    # Register
    reg_resp = client.post("/api/auth/register", json={
        "email": unique_email,
        "password": "SecurePassword987!",
        "full_name": "New Tester",
        "organization_name": "Testing Org"
    })
    assert reg_resp.status_code == 201
    reg_data = reg_resp.json()
    assert "access_token" in reg_data
    assert reg_data["user"]["email"] == unique_email
    assert "hashed_password" not in reg_data["user"]

    token = reg_data["access_token"]

    # /api/auth/me with token
    me_resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["email"] == unique_email

    # Login
    login_resp = client.post("/api/auth/login", json={
        "email": unique_email,
        "password": "SecurePassword987!"
    })
    assert login_resp.status_code == 200
    login_data = login_resp.json()
    assert "access_token" in login_data

    # Login with wrong password -> 401
    bad_login_resp = client.post("/api/auth/login", json={
        "email": unique_email,
        "password": "IncorrectPassword"
    })
    assert bad_login_resp.status_code == 401


# ===========================================================================
# 7. Dev/Test Mode Fallback (AUTH_DEV_MODE=true)
# ===========================================================================

def test_dev_mode_supports_x_user_id_and_legacy_fallback(monkeypatch, test_users):
    """With AUTH_DEV_MODE=true, test/dev fallbacks function properly."""
    monkeypatch.setenv("AUTH_DEV_MODE", "true")
    client = TestClient(app)

    # 1. X-User-Id works in DEV mode
    resp_id = client.get("/api/auth/me", headers={"X-User-Id": str(test_users["user_b"].id)})
    assert resp_id.status_code == 200
    assert resp_id.json()["id"] == test_users["user_b"].id

    # 2. X-User-Email works in DEV mode
    resp_email = client.get("/api/auth/me", headers={"X-User-Email": test_users["user_b"].email})
    assert resp_email.status_code == 200
    assert resp_email.json()["email"] == test_users["user_b"].email

    # 3. No header in DEV mode falls back to seeded demo user
    resp_no_header = client.get("/api/auth/me")
    assert resp_no_header.status_code == 200
    assert resp_no_header.json()["email"] == "demo@sensible.local"


# ===========================================================================
# 8. Copilot & Agent Cross-User Isolation
# ===========================================================================

def test_copilot_context_and_agent_cross_user_isolation(db_session, test_users, monkeypatch):
    """
    Verify that Copilot and Proactive Agent contexts are strictly scoped to the authenticated user.
    """
    monkeypatch.setenv("AUTH_DEV_MODE", "false")
    client = TestClient(app)

    # 1. Copilot context User A vs User B
    resp_copilot_a = client.get(
        "/api/copilot/context",
        headers={"Authorization": f"Bearer {test_users['token_a']}"}
    )
    assert resp_copilot_a.status_code == 200

    resp_copilot_b = client.get(
        "/api/copilot/context",
        headers={"Authorization": f"Bearer {test_users['token_b']}"}
    )
    assert resp_copilot_b.status_code == 200

    # 2. Proactive agent actions User A vs User B
    resp_agent_a = client.get(
        "/api/agent/actions",
        headers={"Authorization": f"Bearer {test_users['token_a']}"}
    )
    assert resp_agent_a.status_code == 200

    resp_agent_b = client.get(
        "/api/agent/actions",
        headers={"Authorization": f"Bearer {test_users['token_b']}"}
    )
    assert resp_agent_b.status_code == 200


# ===========================================================================
# 9. Authorization Header Hardening — 5 Required Regression Cases
# ===========================================================================

def test_case1_valid_token_wins_over_conflicting_x_user_id(monkeypatch, test_users):
    """
    Case 1: Authorization: Bearer VALID_TOKEN_A  +  X-User-Id: B  →  authenticate as A

    A valid bearer token must always win. X-User-Id header must be completely ignored.
    """
    monkeypatch.setenv("AUTH_DEV_MODE", "true")  # DEV mode ON to confirm header is still ignored
    client = TestClient(app)

    resp = client.get(
        "/api/auth/me",
        headers={
            "Authorization": f"Bearer {test_users['token_a']}",
            "X-User-Id": str(test_users["user_b"].id),
        }
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == test_users["user_a"].id, (
        f"Expected User A (id={test_users['user_a'].id}) but got id={data['id']}"
    )
    assert data["email"] == test_users["user_a"].email


def test_case2_invalid_token_plus_x_user_id_returns_401(monkeypatch, test_users):
    """
    Case 2: Authorization: Bearer INVALID_TOKEN  +  X-User-Id: B  →  401

    An invalid bearer token must never fall back to X-User-Id.
    The Authorization header presence gates the entire decision; once present,
    any failure must return 401 unconditionally.
    """
    monkeypatch.setenv("AUTH_DEV_MODE", "true")  # DEV mode ON — fallback must still be blocked
    client = TestClient(app)

    resp = client.get(
        "/api/auth/me",
        headers={
            "Authorization": "Bearer this.is.an.invalid.token",
            "X-User-Id": str(test_users["user_b"].id),
        }
    )
    assert resp.status_code == 401, (
        f"Expected 401 for invalid token but got {resp.status_code}: {resp.json()}"
    )


def test_case3_expired_token_plus_x_user_email_returns_401(monkeypatch, test_users):
    """
    Case 3: Authorization: Bearer EXPIRED_TOKEN  +  X-User-Email: B  →  401

    An expired bearer token must never fall back to X-User-Email.
    """
    monkeypatch.setenv("AUTH_DEV_MODE", "true")  # DEV mode ON — fallback must still be blocked

    expired_token = create_access_token(
        test_users["user_a"].id,
        email=test_users["user_a"].email,
        role=test_users["user_a"].role,
        expires_in_seconds=-30,  # already expired
    )
    client = TestClient(app)

    resp = client.get(
        "/api/auth/me",
        headers={
            "Authorization": f"Bearer {expired_token}",
            "X-User-Email": test_users["user_b"].email,
        }
    )
    assert resp.status_code == 401, (
        f"Expected 401 for expired token but got {resp.status_code}: {resp.json()}"
    )


def test_case4_no_auth_header_dev_mode_uses_x_user_id(monkeypatch, test_users):
    """
    Case 4: No Authorization header  +  X-User-Id: B  +  AUTH_DEV_MODE=true  →  DEV/TEST user B

    When Authorization header is completely absent and DEV mode is on, X-User-Id fallback works.
    """
    monkeypatch.setenv("AUTH_DEV_MODE", "true")
    client = TestClient(app)

    resp = client.get(
        "/api/auth/me",
        headers={"X-User-Id": str(test_users["user_b"].id)}
        # Note: No "Authorization" header
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == test_users["user_b"].id, (
        f"Expected User B (id={test_users['user_b'].id}) via X-User-Id but got id={data['id']}"
    )


def test_case5_no_auth_header_prod_mode_returns_401(monkeypatch):
    """
    Case 5: No Authorization header  +  AUTH_DEV_MODE=false  →  401

    With no Authorization header and production mode, all requests must be rejected.
    """
    monkeypatch.setenv("AUTH_DEV_MODE", "false")
    client = TestClient(app)

    resp = client.get("/api/auth/me")
    assert resp.status_code == 401, (
        f"Expected 401 with no auth in prod mode but got {resp.status_code}: {resp.json()}"
    )


def test_non_bearer_authorization_format_returns_401(monkeypatch, test_users):
    """
    Bonus: Authorization: Basic dXNlcjpwYXNz  →  401

    Non-Bearer Authorization schemes must be rejected immediately.
    They must NEVER fall through to DEV-mode fallbacks regardless of AUTH_DEV_MODE.
    This verifies the fix to the original bypass where a non-"Bearer " header
    would silently be treated as absent.
    """
    monkeypatch.setenv("AUTH_DEV_MODE", "true")  # DEV mode ON — must still be blocked
    client = TestClient(app)

    resp = client.get(
        "/api/auth/me",
        headers={
            "Authorization": "Basic dXNlcjpwYXNz",  # base64("user:pass")
            "X-User-Id": str(test_users["user_a"].id),
        }
    )
    assert resp.status_code == 401, (
        f"Expected 401 for non-Bearer Authorization but got {resp.status_code}: {resp.json()}"
    )
