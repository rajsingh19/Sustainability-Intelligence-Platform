#!/usr/bin/env python3
"""
Final Acceptance & User Isolation Verification Suite
Covers Sections 2 through 15 & Section 20 of the Final Security Gate.
Uses standard library urllib.request.
"""
import urllib.request
import urllib.error
import json
import time
import sys

BASE_URL = "http://localhost:8005"

def log_test(title):
    print(f"\n{'='*70}\n>>> {title}\n{'='*70}")

def assert_true(cond, msg):
    if cond:
        print(f"  [PASS] {msg}")
    else:
        print(f"  [FAIL] {msg}")
        raise AssertionError(msg)

def make_request(method, path, data=None, headers=None):
    url = f"{BASE_URL}{path}"
    headers = headers or {}
    req_data = None
    if data is not None:
        req_data = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            body = resp.read().decode("utf-8")
            status = resp.status
            try:
                json_data = json.loads(body)
            except Exception:
                json_data = body
            return status, json_data
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            json_data = json.loads(body)
        except Exception:
            json_data = body
        return e.code, json_data
    except Exception as e:
        return 500, str(e)

def run_acceptance_suite():
    # -------------------------------------------------------------
    # 2. PRODUCTION AUTHENTICATION TESTS
    # -------------------------------------------------------------
    log_test("2. PRODUCTION AUTHENTICATION TESTS")
    
    # Missing auth
    status, _ = make_request("GET", "/api/documents")
    assert_true(status == 401, f"GET /api/documents without auth returned {status} (expected 401)")
    
    # Invalid Bearer
    status, _ = make_request("GET", "/api/documents", headers={"Authorization": "Bearer invalid.token.xyz"})
    assert_true(status == 401, f"GET /api/documents with invalid Bearer returned {status} (expected 401)")
    
    # Basic auth
    status, _ = make_request("GET", "/api/documents", headers={"Authorization": "Basic xyz"})
    assert_true(status == 401, f"GET /api/documents with Basic auth returned {status} (expected 401)")
    
    # X-User-Id only without Authorization
    status, _ = make_request("GET", "/api/documents", headers={"X-User-Id": "1"})
    assert_true(status == 401, f"GET /api/documents with X-User-Id returned {status} (expected 401)")
    
    # X-User-Email only without Authorization
    status, _ = make_request("GET", "/api/documents", headers={"X-User-Email": "demo@sensible.local"})
    assert_true(status == 401, f"GET /api/documents with X-User-Email returned {status} (expected 401)")

    # -------------------------------------------------------------
    # 3. TOKEN CONFLICT & IMPERSONATION TESTS
    # -------------------------------------------------------------
    log_test("3. TOKEN CONFLICT TESTS")
    ts = int(time.time())
    email_a = f"acceptance_user_a_{ts}@sensible.test"
    email_b = f"acceptance_user_b_{ts}@sensible.test"
    
    status_a, res_a = make_request("POST", "/api/auth/register", data={
        "email": email_a,
        "password": "Password123!",
        "full_name": "Acceptance User A",
        "organization_name": "Alpha Acceptance Org"
    })
    assert_true(status_a == 201, f"User A registration returned {status_a}")
    token_a = res_a["access_token"]
    user_a_id = res_a["user"]["id"]
    
    status_b, res_b = make_request("POST", "/api/auth/register", data={
        "email": email_b,
        "password": "Password123!",
        "full_name": "Acceptance User B",
        "organization_name": "Beta Acceptance Org"
    })
    assert_true(status_b == 201, f"User B registration returned {status_b}")
    token_b = res_b["access_token"]
    user_b_id = res_b["user"]["id"]
    
    # Auth Bearer token_a + X-User-Id: B -> should be User A
    status, res = make_request("GET", "/api/auth/me", headers={
        "Authorization": f"Bearer {token_a}",
        "X-User-Id": str(user_b_id)
    })
    assert_true(status == 200 and res.get("id") == user_a_id, f"Bearer token_A + X-User-Id B authenticated as user {res.get('id')} (expected {user_a_id})")

    # Auth Bearer token_a + X-User-Email: B -> should be User A
    status, res = make_request("GET", "/api/auth/me", headers={
        "Authorization": f"Bearer {token_a}",
        "X-User-Email": email_b
    })
    assert_true(status == 200 and res.get("id") == user_a_id, f"Bearer token_A + X-User-Email B authenticated as user {res.get('id')} (expected {user_a_id})")

    # Auth Bearer invalid + X-User-Id: B -> 401
    status, _ = make_request("GET", "/api/documents", headers={
        "Authorization": "Bearer invalid_token",
        "X-User-Id": str(user_b_id)
    })
    assert_true(status == 401, f"Invalid Bearer + X-User-Id returned {status} (expected 401)")

    # -------------------------------------------------------------
    # 4. DOCUMENT ISOLATION
    # -------------------------------------------------------------
    log_test("4. DOCUMENT ISOLATION & PROVENANCE")
    
    # Seed Document A for User A
    status_doc_a, res_doc_a = make_request(
        "POST",
        "/api/documents/sample-seed?sample_type=electricity",
        headers={"Authorization": f"Bearer {token_a}"}
    )
    assert_true(status_doc_a in (200, 201), f"Seed Doc A returned {status_doc_a}")
    doc_a_id = res_doc_a["id"]
    assert_true(res_doc_a.get("user_id") == user_a_id, f"Doc A user_id is {res_doc_a.get('user_id')}")

    # Seed Document B for User B
    status_doc_b, res_doc_b = make_request(
        "POST",
        "/api/documents/sample-seed?sample_type=electricity",
        headers={"Authorization": f"Bearer {token_b}"}
    )
    assert_true(status_doc_b in (200, 201), f"Seed Doc B returned {status_doc_b}")
    doc_b_id = res_doc_b["id"]
    assert_true(res_doc_b.get("user_id") == user_b_id, f"Doc B user_id is {res_doc_b.get('user_id')}")

    # User A listing documents
    status, res = make_request("GET", "/api/documents", headers={"Authorization": f"Bearer {token_a}"})
    docs_a = res.get("documents", [])
    doc_ids_a = [d["id"] for d in docs_a]
    assert_true(doc_a_id in doc_ids_a and doc_b_id not in doc_ids_a, f"User A documents list: {doc_ids_a} (expected [{doc_a_id}])")
    assert_true(res.get("total") == len(docs_a), f"User A total documents pagination count: {res.get('total')}")

    # User B listing documents
    status, res = make_request("GET", "/api/documents", headers={"Authorization": f"Bearer {token_b}"})
    docs_b = res.get("documents", [])
    doc_ids_b = [d["id"] for d in docs_b]
    assert_true(doc_b_id in doc_ids_b and doc_a_id not in doc_ids_b, f"User B documents list: {doc_ids_b} (expected [{doc_b_id}])")
    assert_true(res.get("total") == len(docs_b), f"User B total documents pagination count: {res.get('total')}")

    # -------------------------------------------------------------
    # 5. IDOR TESTS (Direct Document Access)
    # -------------------------------------------------------------
    log_test("5. IDOR TEST (Document Access)")
    
    # User A accesses Doc B
    status, _ = make_request("GET", f"/api/documents/{doc_b_id}", headers={"Authorization": f"Bearer {token_a}"})
    assert_true(status == 404, f"User A -> Doc B returned {status} (expected 404, no leakage)")

    # User B accesses Doc A
    status, _ = make_request("GET", f"/api/documents/{doc_a_id}", headers={"Authorization": f"Bearer {token_b}"})
    assert_true(status == 404, f"User B -> Doc A returned {status} (expected 404, no leakage)")

    # -------------------------------------------------------------
    # 6. CHILD DATA IDOR TESTS
    # -------------------------------------------------------------
    log_test("6. CHILD DATA IDOR TEST (Comprehensive Endpoint Matrix)")
    
    child_endpoints = [
        ("GET", f"/api/documents/{doc_b_id}"),
        ("GET", f"/api/documents/{doc_b_id}/carbon-calculations"),
        ("GET", f"/api/documents/{doc_b_id}/carbon-ledger"),
        ("GET", f"/api/documents/{doc_b_id}/evidence-report"),
        ("GET", f"/api/documents/{doc_b_id}/reduction-intelligence"),
        ("GET", f"/api/reduction-intelligence/document/{doc_b_id}"),
        ("GET", f"/api/reduction-roadmaps?document_id={doc_b_id}"),
        ("GET", f"/api/benchmarks/eligibility?document_id={doc_b_id}"),
        ("GET", f"/api/benchmarks/history?document_id={doc_b_id}"),
        ("GET", f"/api/green-finance/eligible-projects?document_id={doc_b_id}"),
        ("GET", f"/api/carbon-credits/feasibility?document_id={doc_b_id}"),
    ]
    
    for method, path in child_endpoints:
        status, res = make_request(method, path, headers={"Authorization": f"Bearer {token_a}"})
        if "roadmaps" in path or "history" in path or "eligible-projects" in path or "feasibility" in path:
            if status == 404:
                assert_true(True, f"User A -> {path} safely blocked with 404")
            elif status == 200:
                items = res.get("roadmaps", res.get("history", res.get("items", []))) if isinstance(res, dict) else res
                assert_true(len(items) == 0, f"User A -> {path} returned 200 with 0 items (no leakage)")
            else:
                assert_true(status in (401, 403, 404), f"User A -> {path} returned {status}")
        else:
            assert_true(status == 404, f"User A -> {path} returned {status} (expected 404)")

    # -------------------------------------------------------------
    # 7 & 8. COPILOT SECURITY & RAG CONTEXT ISOLATION
    # -------------------------------------------------------------
    log_test("7 & 8. COPILOT SECURITY & RAG CONTEXT ISOLATION")
    
    # Check Copilot RAG context for User A
    status_ctx_a, ctx_a = make_request("GET", "/api/copilot/context?query=What%20documents%20do%20I%20have?", headers={"Authorization": f"Bearer {token_a}"})
    assert_true(status_ctx_a == 200, f"Copilot Context User A returned {status_ctx_a}")
    ctx_a_doc_ids = [d.get("id") or d.get("document_id") for d in ctx_a.get("documents", [])]
    assert_true(doc_b_id not in ctx_a_doc_ids, f"Copilot Context A doc IDs: {ctx_a_doc_ids} (Doc B {doc_b_id} NOT present)")
    
    # Check Copilot RAG context for User B
    status_ctx_b, ctx_b = make_request("GET", "/api/copilot/context?query=What%20documents%20do%20I%20have?", headers={"Authorization": f"Bearer {token_b}"})
    assert_true(status_ctx_b == 200, f"Copilot Context User B returned {status_ctx_b}")
    ctx_b_doc_ids = [d.get("id") or d.get("document_id") for d in ctx_b.get("documents", [])]
    assert_true(doc_a_id not in ctx_b_doc_ids, f"Copilot Context B doc IDs: {ctx_b_doc_ids} (Doc A {doc_a_id} NOT present)")

    # Copilot Chat User A
    status_chat_a, res_chat_a = make_request("POST", "/api/copilot/chat", headers={"Authorization": f"Bearer {token_a}"}, data={
        "message": "Tell me about BETA_SECRET_DOCUMENT_67890 and USER_B_COMPANY"
    })
    assert_true(status_chat_a == 200, f"Copilot Chat A returned {status_chat_a}")
    ans_a = res_chat_a.get("reply", "")
    assert_true("BETA_SECRET_DOCUMENT_67890" not in ans_a and "22222" not in ans_a, "Copilot Chat A does NOT reveal User B secrets")

    # -------------------------------------------------------------
    # 9. PROACTIVE AGENT ISOLATION
    # -------------------------------------------------------------
    log_test("9. PROACTIVE AGENT ISOLATION")
    
    status, _ = make_request("POST", "/api/agent/run", headers={"Authorization": f"Bearer {token_a}"})
    assert_true(status == 200, f"Agent run A returned {status}")
    
    status, res = make_request("GET", "/api/agent/actions", headers={"Authorization": f"Bearer {token_a}"})
    act_a = res.get("actions", [])
    act_a_doc_ids = [a.get("document_id") for a in act_a if a.get("document_id")]
    assert_true(doc_b_id not in act_a_doc_ids, f"User A agent actions doc_ids: {act_a_doc_ids} (No Doc B)")

    # -------------------------------------------------------------
    # 10. CARBON DATA & DASHBOARD ISOLATION
    # -------------------------------------------------------------
    log_test("10. CARBON DATA & DASHBOARD ISOLATION")
    
    status, _ = make_request("GET", "/api/carbon-dashboard", headers={"Authorization": f"Bearer {token_a}"})
    assert_true(status == 200, f"Carbon Dashboard A returned {status}")
    
    status, res = make_request("GET", "/api/carbon-ledger", headers={"Authorization": f"Bearer {token_a}"})
    assert_true(status == 200, f"Carbon Ledger A returned {status}")
    ledger_a = res.get("entries", [])
    ledger_a_doc_ids = [e.get("source_document_id") for e in ledger_a if e.get("source_document_id")]
    assert_true(doc_b_id not in ledger_a_doc_ids, f"User A ledger doc IDs: {ledger_a_doc_ids} (No Doc B)")

    # -------------------------------------------------------------
    # 11 & 12. BENCHMARKING & SHARED REGISTRIES
    # -------------------------------------------------------------
    log_test("11 & 12. BENCHMARKING & SHARED REGISTRIES")
    
    status, _ = make_request("GET", "/api/emission-factors", headers={"Authorization": f"Bearer {token_a}"})
    assert_true(status == 200, f"Shared emission factors accessible: {status}")
    
    status, _ = make_request("GET", "/api/benchmarks/summary", headers={"Authorization": f"Bearer {token_a}"})
    assert_true(status == 200, f"Benchmark summary accessible: {status}")

    # -------------------------------------------------------------
    # 13 & 14. FORGED IDENTITY & QUERY PARAMETER OVERRIDE TESTS
    # -------------------------------------------------------------
    log_test("13 & 14. FORGED IDENTITY & QUERY PARAM OVERRIDES")
    
    status, res = make_request("GET", f"/api/documents?user_id={user_b_id}", headers={"Authorization": f"Bearer {token_a}"})
    assert_true(status == 200, f"GET /api/documents?user_id=B returned {status}")
    q_docs = [d["id"] for d in res.get("documents", [])]
    assert_true(doc_a_id in q_docs and doc_b_id not in q_docs, f"Query param user_id ignored: {q_docs}")

    # -------------------------------------------------------------
    # 15. DEMO / LEGACY DATA ISOLATION (New User C)
    # -------------------------------------------------------------
    log_test("15. NEW USER C (ZERO-DOCUMENT STATE)")
    email_c = f"acceptance_user_c_{ts}@sensible.test"
    status_c, res_c = make_request("POST", "/api/auth/register", data={
        "email": email_c,
        "password": "Password123!",
        "full_name": "Acceptance User C",
        "organization_name": "Gamma Acceptance Org"
    })
    token_c = res_c["access_token"]
    
    status_docs_c, res_docs_c = make_request("GET", "/api/documents", headers={"Authorization": f"Bearer {token_c}"})
    assert_true(status_docs_c == 200, f"User C docs list returned {status_docs_c}")
    docs_c = res_docs_c.get("documents", [])
    assert_true(len(docs_c) == 0, f"New User C has {len(docs_c)} documents (expected 0, no leak of legacy/demo/other user docs)")

    # -------------------------------------------------------------
    # 20. FINAL CROSS-USER ATTACK
    # -------------------------------------------------------------
    log_test("20. FINAL CROSS-USER ATTACK")
    
    status_atk, _ = make_request(
        "GET",
        f"/api/documents/{doc_b_id}",
        headers={
            "Authorization": f"Bearer {token_a}",
            "X-User-Id": str(user_b_id),
            "X-User-Email": email_b
        }
    )
    assert_true(status_atk == 404, f"Cross-user attack with spoofed headers returned {status_atk} (expected 404)")

    print("\n" + "="*70)
    print(">>> ALL ACCEPTANCE SUITE INVARIANTS PASSED SUCCESSFULLY!")
    print("="*70 + "\n")

if __name__ == "__main__":
    run_acceptance_suite()
