import os
import json
import pytest
from unittest.mock import patch, MagicMock
from google import genai

from backend.app.services.llm_service import LLMService
from backend.app.services.copilot_llm import CopilotLLMService
from backend.app.services.document_classifier import DocumentClassifier
from backend.app.schemas.copilot import CopilotContext, SourceContext, CopilotSummary, MetricContext

@pytest.fixture
def mock_gemini_extraction_response():
    return json.dumps({
        "document_type": "Electricity Bill",
        "confidence_score": 0.95,
        "executive_summary": "Extracted high-tension electricity bill for Tara Engineering Works.",
        "metadata": {
            "provider": "gemini",
            "model": "gemini-2.5-flash",
            "confidence": 0.95,
            "extraction_method": "pymupdf",
            "review_status": "COMPLETED",
            "quality_score": 95.0,
            "processing_notes": "Live Gemini Extraction"
        },
        "quality_summary": {
            "total_fields": 10,
            "evidence_backed": 4,
            "high_confidence": 4,
            "medium_confidence": 0,
            "low_confidence": 0,
            "missing_fields": [],
            "human_verified": 0,
            "quality_score": 95.0
        },
        "company": {
            "name": "TARA ENGINEERING WORKS",
            "registration_id": "09AAACT2024E1Z5",
            "address": "Plot 18, Industrial Estate, Kanpur",
            "industry_sector": "Automotive & Engineering",
            "contact_email": "contact@taraengineering.com"
        },
        "period": {
            "billing_month": "October 2024",
            "start_date": "2024-10-01",
            "end_date": "2024-10-31",
            "issue_date": "2024-11-02"
        },
        "energy": {
            "electricity_kwh": 48750.0,
            "peak_demand_kva_kw": 128.5,
            "power_factor": 0.96,
            "renewable_energy_kwh": None,
            "fuel_diesel_liters": None,
            "natural_gas_png_cng": None,
            "total_energy_cost_inr": 453169.56,
            "currency": "INR"
        },
        "carbon_emissions": {
            "scope_1_direct_tco2e": None,
            "scope_2_indirect_tco2e": None,
            "total_ghg_emissions_tco2e": None,
            "emission_intensity_per_unit": None
        },
        "water_and_waste": {
            "water_consumption_kl": None,
            "recycled_water_kl": None,
            "hazardous_waste_kg": None,
            "non_hazardous_waste_kg": None,
            "waste_recycled_percentage": None
        },
        "compliance": {
            "certifications_identified": ["ISO 14001:2015"],
            "audit_standard": "Central Electricity Authority Guidelines",
            "compliance_status": "Compliant",
            "findings_and_recommendations": []
        },
        "line_items": [
            {
                "item_description": "Energy Charges (Active Energy)",
                "quantity": 48750.0,
                "unit": "kWh",
                "unit_rate": 7.20,
                "total_amount": 351000.00
            }
        ],
        "evidence": [
            {
                "field": "electricity_kwh",
                "value": 48750.0,
                "unit": "kWh",
                "confidence": 0.98,
                "confidence_level": "HIGH",
                "source_text": "Total Active Energy Consumption 48,750.00 kWh",
                "is_verified": False,
                "human_corrected_value": None
            }
        ],
        "missing_fields": [],
        "raw_key_value_pairs": {}
    })

def test_gemini_client_initialization():
    """Verify Gemini client initializes properly when GEMINI_API_KEY is supplied."""
    service = LLMService(api_key="valid-test-gemini-key-12345", model="gemini-2.5-flash")
    assert service.is_configured() is True
    assert service.model == "gemini-2.5-flash"
    assert service.client is not None

def test_missing_gemini_key_falls_back_gracefully():
    """Verify LLMService defaults to unconfigured offline mode without API key."""
    service = LLMService(api_key="", model="gemini-2.5-flash")
    assert service.is_configured() is False
    assert service.client is None
    
    # Extraction should execute deterministic heuristic fallback
    res = service.extract_sustainability_data("Sample invoice text", extraction_method="pymupdf")
    assert res is not None
    assert "metadata" in res
    assert res["metadata"]["provider"] == "heuristic_fallback"

def test_gemini_structured_extraction_success(mock_gemini_extraction_response):
    """Verify live Gemini structured extraction parsing and evidence validation."""
    service = LLMService(api_key="valid-test-gemini-key-12345")
    
    mock_response = MagicMock()
    mock_response.text = mock_gemini_extraction_response
    
    with patch.object(service.client.models, "generate_content", return_value=mock_response):
        document_text = "TARA ENGINEERING WORKS Total Active Energy Consumption 48,750.00 kWh Total Amount Payable ₹4,53,169.56"
        res = service.extract_sustainability_data(document_text, extraction_method="pymupdf")
        
        assert res["document_type"] == "Electricity Bill"
        assert res["energy"]["electricity_kwh"] == 48750.0
        assert res["metadata"]["provider"] == "gemini"
        assert res["confidence_score"] > 0.0

def test_gemini_api_failure_triggers_heuristic_fallback():
    """Verify exceptions during Gemini API invocation fall back to heuristic extraction without crashing."""
    service = LLMService(api_key="valid-test-gemini-key-12345")
    
    with patch.object(service.client.models, "generate_content", side_effect=Exception("Gemini quota exceeded or network timeout")):
        sample_bill = "Electricity Bill\nAccount No: HT-1002\nUnits Consumed: 15,200 kWh\nAmount: Rs. 1,20,000"
        res = service.extract_sustainability_data(sample_bill, extraction_method="pymupdf")
        
        assert res is not None
        assert res["document_type"] == "Electricity Bill"
        assert res["metadata"]["provider"] == "heuristic_fallback"
        assert "Gemini API Unavailable" in res["metadata"]["processing_notes"]

def test_gemini_copilot_grounded_response():
    """Verify CopilotLLMService uses Gemini for generating structured RAG answers."""
    copilot_llm = CopilotLLMService(api_key="valid-test-gemini-key-12345", model="gemini-2.5-flash")
    assert copilot_llm.is_configured() is True
    
    mock_copilot_json = json.dumps({
        "answer": "According to [SRC-1], electricity consumption for October 2024 was 48,750 kWh.",
        "source_ids": ["SRC-1"],
        "actions": []
    })
    
    mock_response = MagicMock()
    mock_response.text = mock_copilot_json
    
    ctx = CopilotContext(
        query="What is our electricity consumption?",
        intent="ENERGY",
        sources=[
            SourceContext(
                source_id="SRC-1",
                document_id=1,
                document_name="Electricity Bill Oct 2024",
                field="electricity_kwh",
                value=48750.0,
                unit="kWh",
                source_text="Total Active Energy Consumption 48,750.00 kWh"
            )
        ],
        documents=[],
        summary=CopilotSummary(document_count=1, verified_documents=1, documents_needing_review=0)
    )
    
    with patch.object(copilot_llm.client.models, "generate_content", return_value=mock_response):
        resp = copilot_llm.generate_response(ctx)
        assert resp is not None
        assert "48,750 kwh" in resp.answer.lower() or "48,750" in resp.answer
        assert len(resp.sources) > 0

def test_gemini_copilot_failure_falls_back_to_deterministic():
    """Verify CopilotLLMService falls back to deterministic factual generation on Gemini failure."""
    copilot_llm = CopilotLLMService(api_key="valid-test-gemini-key-12345")
    
    ctx = CopilotContext(
        query="What is our total Scope 2 emission?",
        intent="EMISSIONS",
        sources=[
            SourceContext(
                source_id="SRC-1",
                document_id=1,
                document_name="Electricity Bill",
                field="scope_2_emissions",
                value=31.88,
                unit="tCO2e",
                source_text="Scope 2 Emissions: 31.88 tCO2e"
            )
        ],
        documents=[],
        summary=CopilotSummary(document_count=1, verified_documents=1, documents_needing_review=0)
    )
    ctx.metrics = [
        MetricContext(
            metric_type="scope_2_emissions",
            category="emissions",
            value=31.88,
            unit="tCO2e",
            source_document_id=1,
            verification_status="AI_EXTRACTED"
        )
    ]
    
    with patch.object(copilot_llm.client.models, "generate_content", side_effect=Exception("API 503 Service Unavailable")):
        resp = copilot_llm.generate_response(ctx)
        assert resp is not None
        assert resp.context_available is True
        assert "31.88" in resp.answer
