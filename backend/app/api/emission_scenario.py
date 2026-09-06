"""
api/emission_scenario.py — REST Controller for Emissions Scenario / What-If Engine (Step 22C).

Exposes endpoints for creating, recalculating, listing, and inspecting hypothetical
decarbonization scenarios without modifying historical accounting ledgers.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.models.user import User
from backend.app.models.document import Document
from backend.app.models.emission_scenario import EmissionScenario
from backend.app.services.auth import get_current_user
from backend.app.services.security import get_owned_document
from backend.app.schemas.emission_scenario import (
    ScenarioCreateRequest,
    ScenarioUpdateRequest,
    EmissionScenarioDetailResponse,
    EmissionScenarioListResponse,
    ScenarioResultResponse,
)
from backend.app.services.emission_scenario import EmissionScenarioService

router = APIRouter(prefix="/emission-scenarios", tags=["Emission Scenarios"])
service = EmissionScenarioService()


@router.post("", response_model=EmissionScenarioDetailResponse, status_code=status.HTTP_201_CREATED)
def create_emission_scenario(
    payload: ScenarioCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Creates and calculates a new hypothetical what-if scenario for an owned document.
    """
    if payload.document_id is not None:
        get_owned_document(db, payload.document_id, current_user)
    try:
        scenario = service.create_and_calculate_scenario(db=db, payload=payload)
        return scenario
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to create scenario: {str(e)}")


@router.get("", response_model=EmissionScenarioListResponse)
def list_emission_scenarios(
    document_id: Optional[int] = Query(None, description="Filter by document ID"),
    status: Optional[str] = Query(None, description="Filter by status (DRAFT, CALCULATED, ARCHIVED)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lists all non-archived scenarios for owned documents.
    """
    if document_id is not None:
        get_owned_document(db, document_id, current_user)
    
    items = service.list_scenarios(db=db, document_id=document_id, status=status)
    # Scope to owned documents
    from backend.app.services.auth import is_auth_dev_mode
    if is_auth_dev_mode():
        user_doc_ids = {d.id for d in db.query(Document).all()}
    else:
        user_doc_ids = {d.id for d in db.query(Document).filter(Document.user_id == current_user.id).all()}
    filtered_items = [s for s in items if s.document_id is None or s.document_id in user_doc_ids]
    return EmissionScenarioListResponse(total=len(filtered_items), items=filtered_items)


@router.get("/document/{document_id}", response_model=EmissionScenarioListResponse)
def list_document_scenarios(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Convenience endpoint to list scenarios scoped to a specific owned document.
    """
    get_owned_document(db, document_id, current_user)
    items = service.list_scenarios(db=db, document_id=document_id)
    return EmissionScenarioListResponse(total=len(items), items=items)


@router.get("/{scenario_id}", response_model=EmissionScenarioDetailResponse)
def get_emission_scenario(
    scenario_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves full details of a specific scenario for an owned document.
    """
    scenario = service.get_scenario_by_id(db=db, scenario_id=scenario_id)
    if not scenario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Scenario with id {scenario_id} not found")
    if scenario.document_id is not None:
        get_owned_document(db, scenario.document_id, current_user)
    return scenario


@router.post("/{scenario_id}/calculate", response_model=EmissionScenarioDetailResponse)
def recalculate_emission_scenario(
    scenario_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Recalculates an existing scenario against current baseline ledger actuals for an owned document.
    """
    existing = service.get_scenario_by_id(db=db, scenario_id=scenario_id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Scenario with id {scenario_id} not found")
    if existing.document_id is not None:
        get_owned_document(db, existing.document_id, current_user)
    try:
        scenario = service.recalculate_scenario(db=db, scenario_id=scenario_id)
        return scenario
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to recalculate scenario: {str(e)}")


@router.get("/{scenario_id}/results", response_model=List[ScenarioResultResponse])
def get_scenario_results(
    scenario_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns source-level calculation results with factor snapshots for an owned document.
    """
    scenario = service.get_scenario_by_id(db=db, scenario_id=scenario_id)
    if not scenario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Scenario with id {scenario_id} not found")
    if scenario.document_id is not None:
        get_owned_document(db, scenario.document_id, current_user)
    return scenario.results


@router.patch("/{scenario_id}", response_model=EmissionScenarioDetailResponse)
def update_emission_scenario(
    scenario_id: int,
    payload: ScenarioUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Updates scenario metadata for an owned document.
    """
    existing = service.get_scenario_by_id(db=db, scenario_id=scenario_id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Scenario with id {scenario_id} not found")
    if existing.document_id is not None:
        get_owned_document(db, existing.document_id, current_user)

    scenario = service.update_scenario(db=db, scenario_id=scenario_id, payload=payload)
    return scenario


@router.delete("/{scenario_id}", status_code=status.HTTP_200_OK)
def delete_or_archive_scenario(
    scenario_id: int,
    hard_delete: bool = Query(False, description="Whether to permanently delete instead of archive"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Archives a scenario for an owned document.
    """
    existing = service.get_scenario_by_id(db=db, scenario_id=scenario_id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Scenario with id {scenario_id} not found")
    if existing.document_id is not None:
        get_owned_document(db, existing.document_id, current_user)

    success = service.delete_scenario(db=db, scenario_id=scenario_id, hard_delete=hard_delete)
    return {"message": "Scenario archived successfully" if not hard_delete else "Scenario deleted permanently"}
