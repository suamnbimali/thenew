"""
Smart Matching Engine - Python Microservice

This service handles intelligent worker-to-participant matching for NDIS rostering.
It uses a weighted scoring algorithm considering:
- Certification match (weight: 0.4)
- Training completion (weight: 0.2)
- Experience score (weight: 0.2)
- Distance proximity (weight: 0.1)
- Cost efficiency (weight: 0.1)

Formula: Match Score = Σ(Factor × Weight)
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from enum import Enum
from pydantic import BaseModel, Field
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from geopy.distance import geodesic
import pytz

AUS_EASTERN = pytz.timezone('Australia/Sydney')

class CertificationLevel(str, Enum):
    MUST_HAVE = "must_have"
    PREFERRED = "preferred"
    OPTIONAL = "optional"

class WorkerCertification(BaseModel):
    certification_id: str
    name: str
    expiry_date: Optional[datetime] = None
    is_valid: bool

class WorkerTraining(BaseModel):
    training_id: str
    name: str
    completed_date: Optional[datetime] = None
    status: str  # 'completed', 'in_progress', 'not_started'

class WorkerProfile(BaseModel):
    worker_id: str
    full_name: str
    certifications: List[WorkerCertification]
    trainings: List[WorkerTraining]
    experience_hours: float = 0.0
    hourly_rate: float
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    available: bool = True
    worker_level: int = 1
    previous_shift_end: Optional[datetime] = None

class ParticipantRequirement(BaseModel):
    requirement_id: str
    requirement_type: str  # 'certification' or 'training'
    name: str
    level: CertificationLevel = CertificationLevel.OPTIONAL

class ShiftRequirements(BaseModel):
    shift_id: str
    participant_id: str
    participant_location_lat: float
    participant_location_lng: float
    required_certifications: List[ParticipantRequirement]
    required_trainings: List[ParticipantRequirement]
    shift_start: datetime
    shift_end: datetime
    budget_limit: Optional[float] = None

class MatchingRequest(BaseModel):
    shift_requirements: ShiftRequirements
    candidate_workers: List[WorkerProfile]
    include_excluded: bool = Field(
        default=False,
        description="Include workers that failed hard compliance checks"
    )

class MatchScore(BaseModel):
    worker_id: str
    full_name: str
    total_score: float
    rank: int
    
    # Score breakdown
    certification_score: float
    training_score: float
    experience_score: float
    distance_score: float
    cost_score: float
    
    # Additional info
    hourly_rate: float
    estimated_distance_km: Optional[float] = None
    
    # Compliance status
    compliance_warnings: List[str] = []
    compliance_errors: List[str] = []
    is_excluded: bool = False
    exclusion_reason: Optional[str] = None

class MatchingResponse(BaseModel):
    shift_id: str
    total_candidates: int
    eligible_workers: int
    ranked_matches: List[MatchScore]
    
    # Configuration used
    weights: Dict[str, float]
    max_distance_km: float = 50.0
    
    timestamp: datetime

app = FastAPI(
    title="Smart Matching Engine",
    description="AI-powered worker-to-participant matching for NDIS rostering",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Default weights
default_weights = {
    "certification": 0.4,
    "training": 0.2,
    "experience": 0.2,
    "distance": 0.1,
    "cost": 0.1
}

def calculate_certification_score(
    worker_certs: List[WorkerCertification],
    required_certs: List[ParticipantRequirement]
) -> tuple[float, List[str]]:
    """
    Calculate certification match score
    Returns: (score, warnings)
    """
    if not required_certs:
        return 1.0, []
    
    warnings = []
    cert_names = {c.name: c for c in worker_certs}
    
    must_have_match = 0
    must_have_total = 0
    preferred_match = 0
    preferred_total = 0
    optional_match = 0
    optional_total = 0
    
    for req in required_certs:
        if req.requirement_type != "certification":
            continue
        
        worker_cert = cert_names.get(req.name)
        
        if req.level == CertificationLevel.MUST_HAVE:
            must_have_total += 1
            if worker_cert and worker_cert.is_valid:
                must_have_match += 1
            elif worker_cert and not worker_cert.is_valid:
                warnings.append(f"Must-have certification '{req.name}' expired")
            else:
                warnings.append(f"Must-have certification '{req.name}' missing")
        
        elif req.level == CertificationLevel.PREFERRED:
            preferred_total += 1
            if worker_cert and worker_cert.is_valid:
                preferred_match += 1
        
        elif req.level == CertificationLevel.OPTIONAL:
            optional_total += 1
            if worker_cert and worker_cert.is_valid:
                optional_match += 1
    
    # Hard fail on must-have
    if must_have_match < must_have_total:
        return 0.0, warnings
    
    # Calculate weighted score
    score = 0.0
    total_weight = 0.0
    
    if preferred_total > 0:
        score += (preferred_match / preferred_total) * 0.4
        total_weight += 0.4
    
    if optional_total > 0:
        score += (optional_match / optional_total) * 0.2
        total_weight += 0.2
    
    # Base score for having all must-haves
    score += 0.4
    total_weight += 0.4
    
    return score / total_weight if total_weight > 0 else 1.0, warnings

def calculate_training_score(
    worker_trainings: List[WorkerTraining],
    required_trainings: List[ParticipantRequirement]
) -> tuple[float, List[str]]:
    """
    Calculate training completion score
    Returns: (score, warnings)
    """
    if not required_trainings:
        return 1.0, []
    
    warnings = []
    training_names = {t.name: t for t in worker_trainings}
    
    completed_count = 0
    total_required = len(required_trainings)
    
    for req in required_trainings:
        if req.requirement_type != "training":
            continue
        
        training = training_names.get(req.name)
        
        if training and training.status == "completed":
            completed_count += 1
        elif req.level == CertificationLevel.MUST_HAVE:
            warnings.append(f"Required training '{req.name}' not completed")
    
    score = completed_count / total_required if total_required > 0 else 1.0
    
    return score, warnings

def calculate_experience_score(
    experience_hours: float,
    shift_duration_hours: float
) -> float:
    """
    Calculate experience score
    More experience = higher score, with diminishing returns
    """
    # Base score from 0-1 based on experience
    # 0 hours = 0 score
    # 1000 hours = 0.8 score
    # 5000+ hours = 1.0 score
    
    if experience_hours < 100:
        return 0.1
    elif experience_hours < 500:
        return 0.3 + (experience_hours - 100) / 400 * 0.3
    elif experience_hours < 1000:
        return 0.6 + (experience_hours - 500) / 500 * 0.2
    elif experience_hours < 5000:
        return 0.8 + (experience_hours - 1000) / 4000 * 0.15
    else:
        return 0.95

def calculate_distance_score(
    worker_lat: Optional[float],
    worker_lng: Optional[float],
    participant_lat: float,
    participant_lng: float,
    max_distance_km: float = 50.0
) -> tuple[float, Optional[float]]:
    """
    Calculate distance score
    Returns: (score, distance_in_km)
    """
    if worker_lat is None or worker_lng is None:
        return 0.0, None
    
    distance = geodesic(
        (worker_lat, worker_lng),
        (participant_lat, participant_lng)
    ).kilometers
    
    # If outside max distance, score is 0
    if distance > max_distance_km:
        return 0.0, distance
    
    # Score decreases with distance
    # 0 km = 1.0 score
    # 10 km = 0.8 score
    # 25 km = 0.5 score
    # 50 km = 0.2 score
    
    if distance < 5:
        return 1.0, distance
    elif distance < 10:
        return 0.9, distance
    elif distance < 20:
        return 0.7, distance
    elif distance < 35:
        return 0.5, distance
    else:
        return 0.3, distance

def calculate_cost_score(
    worker_rate: float,
    budget_limit: Optional[float],
    shift_duration_hours: float
) -> float:
    """
    Calculate cost efficiency score
    Lower rate = higher score
    """
    if budget_limit is None:
        # If no budget, assume market rate of $35/hr
        market_rate = 35.0
    else:
        market_rate = budget_limit / shift_duration_hours
    
    # Score: lower rate is better
    if worker_rate <= market_rate:
        return 1.0
    elif worker_rate <= market_rate * 1.2:
        return 0.8
    elif worker_rate <= market_rate * 1.5:
        return 0.6
    else:
        return 0.4

def check_schads_compliance(
    worker: WorkerProfile,
    shift_start: datetime
) -> List[str]:
    """
    Check SCHADS compliance for worker
    Returns: list of warnings/errors
    """
    warnings = []
    
    if worker.previous_shift_end:
        break_hours = (shift_start - worker.previous_shift_end).total_seconds() / 3600
        min_break = 7.0  # SCHADS minimum
        
        if break_hours < min_break:
            warnings.append(
                f"SCHADS: Break only {break_hours:.1f}hr (min: {min_break}hr) - fatigue risk"
            )
    
    return warnings

def calculate_match_score(
    worker: WorkerProfile,
    requirements: ShiftRequirements,
    weights: Dict[str, float],
    max_distance_km: float = 50.0
) -> MatchScore:
    """
    Calculate overall match score for a worker
    """
    
    # Calculate individual scores
    cert_score, cert_warnings = calculate_certification_score(
        worker.certifications,
        requirements.required_certifications
    )
    
    training_score, training_warnings = calculate_training_score(
        worker.trainings,
        requirements.required_trainings
    )
    
    shift_duration = (
        requirements.shift_end - requirements.shift_start
    ).total_seconds() / 3600
    
    experience_score = calculate_experience_score(
        worker.experience_hours,
        shift_duration
    )
    
    distance_score, distance_km = calculate_distance_score(
        worker.location_lat,
        worker.location_lng,
        requirements.participant_location_lat,
        requirements.participant_location_lng,
        max_distance_km
    )
    
    cost_score = calculate_cost_score(
        worker.hourly_rate,
        requirements.budget_limit,
        shift_duration
    )
    
    # Calculate weighted total score
    total_score = (
        cert_score * weights["certification"] +
        training_score * weights["training"] +
        experience_score * weights["experience"] +
        distance_score * weights["distance"] +
        cost_score * weights["cost"]
    )
    
    # Check for hard exclusions
    compliance_errors = []
    is_excluded = False
    exclusion_reason = None
    
    # Check if must-have certifications are met
    if cert_score == 0.0:
        is_excluded = True
        exclusion_reason = "Missing required certifications"
    
    # Check availability
    if not worker.available:
        is_excluded = True
        exclusion_reason = "Worker not available"
    
    # Check distance
    if distance_score == 0.0 and distance_km and distance_km > max_distance_km:
        compliance_errors.append(
            f"Distance {distance_km:.1f}km exceeds limit ({max_distance_km}km)"
        )
    
    # Check SCHADS compliance
    schads_warnings = check_schads_compliance(worker, requirements.shift_start)
    
    # Combine all warnings
    all_warnings = cert_warnings + training_warnings + schads_warnings
    
    return MatchScore(
        worker_id=worker.worker_id,
        full_name=worker.full_name,
        total_score=round(total_score, 3),
        rank=0,  # Will be set after sorting
        certification_score=round(cert_score, 3),
        training_score=round(training_score, 3),
        experience_score=round(experience_score, 3),
        distance_score=round(distance_score, 3),
        cost_score=round(cost_score, 3),
        hourly_rate=worker.hourly_rate,
        estimated_distance_km=round(distance_km, 2) if distance_km else None,
        compliance_warnings=all_warnings,
        compliance_errors=compliance_errors,
        is_excluded=is_excluded,
        exclusion_reason=exclusion_reason
    )

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "Matching Engine"}

@app.post("/match", response_model=MatchingResponse)
async def match_workers(request: MatchingRequest):
    """
    Match workers to a shift and rank by suitability
    
    Returns ranked list of workers with:
    - Overall match score (0-1)
    - Individual component scores
    - Compliance warnings/errors
    - Estimated costs
    """
    
    try:
        # Calculate match scores for all workers
        match_scores = []
        for worker in request.candidate_workers:
            score = calculate_match_score(
                worker,
                request.shift_requirements,
                default_weights
            )
            match_scores.append(score)
        
        # Filter out excluded workers (unless requested)
        if not request.include_excluded:
            eligible = [s for s in match_scores if not s.is_excluded]
            excluded = [s for s in match_scores if s.is_excluded]
        else:
            eligible = match_scores
            excluded = []
        
        # Sort by total score (descending)
        eligible.sort(key=lambda x: x.total_score, reverse=True)
        
        # Assign ranks
        for i, match in enumerate(eligible):
            match.rank = i + 1
        
        # Calculate estimated cost for each match
        shift_hours = (
            request.shift_requirements.shift_end - 
            request.shift_requirements.shift_start
        ).total_seconds() / 3600
        
        return MatchingResponse(
            shift_id=request.shift_requirements.shift_id,
            total_candidates=len(request.candidate_workers),
            eligible_workers=len(eligible),
            ranked_matches=eligible + excluded,
            weights=default_weights,
            max_distance_km=50.0,
            timestamp=datetime.now(AUS_EASTERN)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Matching error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
