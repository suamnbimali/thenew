"""
SCHADS Award Engine - Python Microservice

This service handles all SCHADS (Social, Community, Home Care and Disability Services)
Industry Award calculations including:
- Ordinary hours vs overtime
- Shift penalties (evenings, weekends, public holidays)
- Minimum break requirements between shifts
- Cost estimation per shift

Reference: SCHADS Award [MA000019]
"""

from datetime import datetime, time, timedelta
from typing import Optional, List, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pytz

# Australian timezone
AUS_EASTERN = pytz.timezone('Australia/Sydney')

class ShiftType(str, Enum):
    ORDINARY = "ordinary"
    OVERTIME = "overtime"
    EVENING_PENALTY = "evening_penalty"
    WEEKEND_PENALTY = "weekend_penalty"
    PUBLIC_HOLIDAY = "public_holiday"
    SLEEPOVER = "sleepover"

class SCHADSCalculationRequest(BaseModel):
    """Request model for SCHADS calculation"""
    
    # Worker info
    base_hourly_rate: float = Field(..., description="Base hourly rate in AUD")
    worker_level: int = Field(default=1, ge=1, le=4, description="Worker classification level (1-4)")
    
    # Shift details
    start_time: datetime = Field(..., description="Shift start time (in AEST)")
    end_time: datetime = Field(..., description="Shift end time (in AEST)")
    
    # Optional modifiers
    is_sleepover: bool = Field(default=False, description="Is this a sleepover shift?")
    public_holiday: Optional[str] = Field(default=None, description="Public holiday name if applicable")
    
    # Previous shift info for break calculation
    previous_shift_end: Optional[datetime] = Field(default=None, description="Previous shift end time")

class SCHADSCalculationResponse(BaseModel):
    """Response model with all SCHADS calculations"""
    
    total_hours: float
    ordinary_hours: float
    overtime_hours: float
    
    shift_type: ShiftType
    
    penalty_multipliers: List[Dict[str, Any]]
    
    breakdown: List[Dict[str, Any]]
    
    total_cost: float
    
    min_break_required_hours: float
    break_compliance: Optional[Dict[str, Any]] = None
    
    warnings: List[str] = []

app = FastAPI(
    title="SCHADS Award Engine",
    description="SCHADS Industry Award calculation service for NDIS rostering",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# SCHADS Award Constants (based on MA000019)
# Note: These are simplified for demonstration - actual implementation needs full award review

LEVEL_RATES = {
    1: 1.0,   # Base rate multiplier
    2: 1.05,  # Level 2: 5% above level 1
    3: 1.1,   # Level 3: 10% above level 1
    4: 1.15,  # Level 4: 15% above level 1
}

PENALTY_RATES = {
    "evening": 1.15,      # 15% loading for evening work
    "saturday": 1.50,     # 50% loading for Saturday
    "sunday": 2.00,       # Double time for Sunday
    "public_holiday": 2.50, # 2.5x for public holidays
    "overtime_first_2hrs": 1.5,
    "overtime_after_2hrs": 2.0,
    "sleepover": 0.57,     # Sleepover rate (57% of ordinary hourly rate)
}

MINIMUM_BREAK_HOURS = 7.0  # Minimum break between shifts (SCHADS)
EVENING_START = time(18, 0)  # 6:00 PM
EVENING_END = time(6, 0)    # 6:00 AM next day
OVERTIME_THRESHOLD_HOURS = 8.0  # Hours before overtime applies
def calculate_shift_breakdown(
    start_time: datetime,
    end_time: datetime,
    is_sleepover: bool = False
) -> Dict[str, Any]:
    """Calculate detailed breakdown of shift hours by type"""
    
    total_hours = (end_time - start_time).total_seconds() / 3600
    
    if is_sleepover:
        # Sleepover has flat rate
        return {
            "total_hours": total_hours,
            "type": ShiftType.SLEEPOVER,
            "breakdown": [{
                "type": "sleepover",
                "hours": total_hours,
                "rate_multiplier": PENALTY_RATES["sleepover"]
            }]
        }
    
    breakdown = []
    shift_type = ShiftType.ORDINARY
    
    # Check for overtime
    if total_hours > OVERTIME_THRESHOLD_HOURS:
        ordinary = OVERTIME_THRESHOLD_HOURS
        overtime = total_hours - OVERTIME_THRESHOLD_HOURS
        
        breakdown.append({
            "type": "ordinary",
            "hours": ordinary,
            "rate_multiplier": 1.0
        })
        
        if overtime > 2:
            breakdown.append({
                "type": "overtime_first_2hrs",
                "hours": 2.0,
                "rate_multiplier": PENALTY_RATES["overtime_first_2hrs"]
            })
            breakdown.append({
                "type": "overtime_after_2hrs",
                "hours": overtime - 2.0,
                "rate_multiplier": PENALTY_RATES["overtime_after_2hrs"]
            })
        else:
            breakdown.append({
                "type": "overtime_first_2hrs",
                "hours": overtime,
                "rate_multiplier": PENALTY_RATES["overtime_first_2hrs"]
            })
        
        shift_type = ShiftType.OVERTIME
    else:
        # All ordinary hours - check for penalties
        breakdown.append({
            "type": "ordinary",
            "hours": total_hours,
            "rate_multiplier": 1.0
        })
    
    return {
        "total_hours": total_hours,
        "type": shift_type,
        "breakdown": breakdown
    }

def apply_weekend_penalties(
    breakdown: Dict[str, Any],
    start_time: datetime,
    end_time: datetime
) -> List[Dict[str, Any]]:
    """Apply weekend penalties to shift breakdown"""
    
    updated_breakdown = []
    
    for segment in breakdown["breakdown"]:
        hours = segment["hours"]
        rate_mult = segment["rate_multiplier"]
        
        # Determine if segment falls on weekend
        weekday = start_time.weekday()  # 0=Monday, 6=Sunday
        
        if weekday == 5:  # Saturday
            rate_mult = max(rate_mult, PENALTY_RATES["saturday"])
            updated_breakdown.append({
                "type": segment["type"],
                "hours": hours,
                "rate_multiplier": rate_mult,
                "penalty_applied": "saturday_50%"
            })
        elif weekday == 6:  # Sunday
            rate_mult = max(rate_mult, PENALTY_RATES["sunday"])
            updated_breakdown.append({
                "type": segment["type"],
                "hours": hours,
                "rate_multiplier": rate_mult,
                "penalty_applied": "sunday_double_time"
            })
        else:
            updated_breakdown.append(segment)
    
    return updated_breakdown

def calculate_break_compliance(
    previous_shift_end: Optional[datetime],
    current_shift_start: datetime
) -> Dict[str, Any]:
    """Check if minimum break requirement is met"""
    
    if previous_shift_end is None:
        return {
            "compliant": True,
            "message": "No previous shift"
        }
    
    break_hours = (current_shift_start - previous_shift_end).total_seconds() / 3600
    
    if break_hours >= MINIMUM_BREAK_HOURS:
        return {
            "compliant": True,
            "break_hours": round(break_hours, 2),
            "min_required": MINIMUM_BREAK_HOURS,
            "message": f"Compliant: {break_hours:.1f}hr break (min: {MINIMUM_BREAK_HOURS}hr)"
        }
    else:
        return {
            "compliant": False,
            "break_hours": round(break_hours, 2),
            "min_required": MINIMUM_BREAK_HOURS,
            "shortfall_hours": round(MINIMUM_BREAK_HOURS - break_hours, 2),
            "message": f"NON-COMPLIANT: Only {break_hours:.1f}hr break (min: {MINIMUM_BREAK_HOURS}hr)",
            "warning": "SCHADS Award violation - minimum break not met"
        }

def calculate_total_cost(
    breakdown: List[Dict[str, Any]],
    base_rate: float,
    worker_level: int
) -> float:
    """Calculate total cost for shift"""
    
    level_multiplier = LEVEL_RATES.get(worker_level, 1.0)
    adjusted_base_rate = base_rate * level_multiplier
    
    total = 0.0
    for segment in breakdown:
        hours = segment["hours"]
        rate_mult = segment["rate_multiplier"]
        total += hours * adjusted_base_rate * rate_mult
    
    return round(total, 2)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "SCHADS Engine"}

@app.post("/calculate", response_model=SCHADSCalculationResponse)
async def calculate_schads(request: SCHADSCalculationRequest):
    """
    Calculate SCHADS award costs and compliance for a shift
    
    This endpoint provides:
    - Detailed hour breakdown (ordinary, overtime, penalties)
    - Total cost calculation
    - Minimum break compliance check
    - SCHADS violation warnings
    """
    
    try:
        # 1. Calculate basic breakdown
        breakdown_result = calculate_shift_breakdown(
            request.start_time,
            request.end_time,
            request.is_sleepover
        )
        
        # 2. Apply weekend penalties if applicable
        if request.public_holiday:
            # Public holiday applies 2.5x to all hours
            for segment in breakdown_result["breakdown"]:
                segment["rate_multiplier"] = PENALTY_RATES["public_holiday"]
                segment["penalty_applied"] = f"public_holiday: {request.public_holiday}"
        else:
            breakdown_result["breakdown"] = apply_weekend_penalties(
                breakdown_result,
                request.start_time,
                request.end_time
            )
        
        # 3. Check break compliance
        break_compliance_result = calculate_break_compliance(
            request.previous_shift_end,
            request.start_time
        )
        
        # 4. Calculate total cost
        total_cost = calculate_total_cost(
            breakdown_result["breakdown"],
            request.base_hourly_rate,
            request.worker_level
        )
        
        # 5. Compile penalty multipliers list
        penalty_multipliers = []
        for segment in breakdown_result["breakdown"]:
            if "penalty_applied" in segment:
                penalty_multipliers.append({
                    "name": segment["penalty_applied"],
                    "multiplier": segment["rate_multiplier"]
                })
        
        # 6. Compile warnings
        warnings = []
        if not break_compliance_result["compliant"]:
            warnings.append(break_compliance_result["warning"])
        
        # 7. Build response
        return SCHADSCalculationResponse(
            total_hours=round(breakdown_result["total_hours"], 2),
            ordinary_hours=round(sum(s["hours"] for s in breakdown_result["breakdown"] if s["type"] == "ordinary"), 2),
            overtime_hours=round(sum(s["hours"] for s in breakdown_result["breakdown"] if "overtime" in s["type"]), 2),
            shift_type=breakdown_result["type"],
            penalty_multipliers=penalty_multipliers,
            breakdown=breakdown_result["breakdown"],
            total_cost=total_cost,
            min_break_required_hours=MINIMUM_BREAK_HOURS,
            break_compliance=break_compliance_result if request.previous_shift_end else None,
            warnings=warnings
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Calculation error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
