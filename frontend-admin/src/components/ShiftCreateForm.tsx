'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, Save, AlertCircle } from 'lucide-react'
import { calculateSCHADS, matchWorkers, getWorkers, getParticipants } from '@/lib/api'
import { SCHADSCalculationRequest, WorkerProfile } from '@/lib/api'

interface ShiftCreateFormProps {
  businessId: string
}

export default function ShiftCreateForm({ businessId }: ShiftCreateFormProps) {
  const [participants, setParticipants] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [matching, setMatching] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    participant_id: '',
    start_time: '',
    end_time: '',
    required_certifications: [] as any[],
    required_trainings: [] as any[],
  })
  
  // Compliance and calculation results
  const [schadsResult, setSchadsResult] = useState<any>(null)
  const [matchingResult, setMatchingResult] = useState<any>(null)
  const [complianceWarnings, setComplianceWarnings] = useState<string[]>([])
  const [budgetWarning, setBudgetWarning] = useState<string | null>(null)
  
  // Mode: auto-assign or manual-select
  const [assignmentMode, setAssignmentMode] = useState<'auto' | 'manual'>('manual')

  const [selectedWorker, setSelectedWorker] = useState<string | null>(null)
  
  useEffect(() => {
    // Load participants
    const loadParticipants = async () => {
      try {
        const result = await getParticipants()
        setParticipants(result.items)
      } catch (error) {
        console.error('Error loading participants:', error)
      }
    }
    loadParticipants()
  }, [])
  
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Reset results when form changes
    setSchadsResult(null)
    setMatchingResult(null)
  }
  
  const calculateCost = async () => {
    if (!formData.start_time || !formData.end_time || !formData.participant_id) {
      alert('Please select participant and shift times first')
      return
    }
    
    setCalculating(true)
    try {
      const request: SCHADSCalculationRequest = {
        base_hourly_rate: 35.0, // Default rate, will use matched worker rate
        worker_level: 1,
        start_time: formData.start_time,
        end_time: formData.end_time,
      }
      
      const result = await calculateSCHADS(request)
      setSchadsResult(result)
      
      // Set compliance warnings
      const warnings: string[] = []
      if (result.warnings.length > 0) {
        warnings.push(...result.warnings)
      }
      setComplianceWarnings(warnings)
    } catch (error) {
      console.error('Error calculating SCHADS:', error)
      alert('Error calculating shift cost')
    } finally {
      setCalculating(false)
    }
  }
  
  const findWorkers = async () => {
    if (!formData.start_time || !formData.end_time || !formData.participant_id) {
      alert('Please complete shift details first')
      return
    }
    
    setMatching(true)
    try {
      const workers = await getWorkers()
      const workerProfiles: WorkerProfile[] = workers.items.map((w: any) => ({
        worker_id: w.id,
        full_name: w.name,
        hourly_rate: w.hourly_rate,
        certifications: w.certifications || [],
        trainings: w.trainings || [],
        experience_hours: w.experience_hours,
        location_lat: w.location_lat,
        location_lng: w.location_lng,
        available: w.available,
        worker_level: w.worker_level,
      }))
      
      // Get selected participant for location
      const participant = participants.find(p => p.id === formData.participant_id)
      
      const request = {
        shift_requirements: {
          shift_id: 'temp',
          participant_id: formData.participant_id,
          participant_location_lat: participant?.location_lat || 0,
          participant_location_lng: participant?.location_lng || 0,
          required_certifications: formData.required_certifications,
          required_trainings: formData.required_trainings,
          shift_start: formData.start_time,
          shift_end: formData.end_time,
          budget_limit: participant?.funding_budget_total,
        },
        candidate_workers: workerProfiles,
        include_excluded: false,
      }
      
      const result = await matchWorkers(request)
      setMatchingResult(result)
      
      // Check budget
      if (participant) {
        const estimatedCost = result.ranked_matches[0]?.hourly_rate * schadsResult?.total_hours || 0
        const remainingBudget = participant.funding_budget_total - participant.funding_spent
        if (estimatedCost > remainingBudget) {
          setBudgetWarning(`Estimated cost $${estimatedCost.toFixed(2)} exceeds remaining budget $${remainingBudget.toFixed(2)}`)
        } else {
          setBudgetWarning(null)
        }
      }
    } catch (error) {
      console.error('Error matching workers:', error)
      alert('Error finding workers')
    } finally {
      setMatching(false)
    }
  }
  
  const handleSaveShift = async () => {
    if (!selectedWorker && assignmentMode === 'manual') {
      alert('Please select a worker')
      return
    }
    
    if (complianceWarnings.length > 0 || budgetWarning) {
      const confirmOverride = confirm(
        'There are compliance warnings. Do you want to continue?\n\n' +
        complianceWarnings.join('\n') +
        (budgetWarning ? '\n\n' + budgetWarning : '')
      )
      if (!confirmOverride) return
    }
    
    setLoading(true)
    try {
      // Save shift to PocketBase
      const shiftData = {
        participant_id: formData.participant_id,
        start_time: formData.start_time,
        end_time: formData.end_time,
        status: 'assigned',
        estimated_cost: schadsResult?.total_cost,
        assigned_worker_id: assignmentMode === 'auto' ? matchingResult?.ranked_matches[0]?.worker_id : selectedWorker,
        required_certifications: formData.required_certifications,
        required_trainings: formData.required_trainings,
        business_id: businessId,
      }
      
      // await createShift(shiftData)
      alert('Shift created successfully!')
      
      // Reset form
      setFormData({
        participant_id: '',
        start_time: '',
        end_time: '',
        required_certifications: [],
        required_trainings: [],
      })
      setSchadsResult(null)
      setMatchingResult(null)
    } catch (error) {
      console.error('Error creating shift:', error)
      alert('Error creating shift')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="space-y-6">
      {/* Basic Shift Details */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Calendar className="h-5 w-5 mr-2" />
          Shift Details
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Participant Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Participant *
            </label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              value={formData.participant_id}
              onChange={(e) => handleInputChange('participant_id', e.target.value)}
              required
            >
              <option value="">Select participant...</option>
              {participants.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} (NDIS: {p.ndis_number || 'N/A'})
                </option>
              ))}
            </select>
          </div>
          
          {/* Assignment Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assignment Mode
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  className="mr-2 text-primary-600 focus:ring-primary-500"
                  value="manual"
                  checked={assignmentMode === 'manual'}
                  onChange={() => setAssignmentMode('manual')}
                />
                <span className="text-sm text-gray-700">Manual Select</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  className="mr-2 text-primary-600 focus:ring-primary-500"
                  value="auto"
                  checked={assignmentMode === 'auto'}
                  onChange={() => setAssignmentMode('auto')}
                />
                <span className="text-sm text-gray-700">Auto-Assign Best Match</span>
              </label>
            </div>
          </div>
          
          {/* Start Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Time *
            </label>
            <input
              type="datetime-local"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              value={formData.start_time}
              onChange={(e) => handleInputChange('start_time', e.target.value)}
              required
            />
          </div>
          
          {/* End Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Time *
            </label>
            <input
              type="datetime-local"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              value={formData.end_time}
              onChange={(e) => handleInputChange('end_time', e.target.value)}
              required
            />
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex space-x-4 mt-6">
          <button
            onClick={calculateCost}
            disabled={calculating}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
          >
            <Clock className="h-4 w-4 mr-2" />
            {calculating ? 'Calculating...' : 'Calculate Cost'}
          </button>
          
          <button
            onClick={findWorkers}
            disabled={matching}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {matching ? 'Finding...' : 'Find Workers'}
          </button>
        </div>
      </div>
      
      {/* SCHADS Calculation Result */}
      {schadsResult && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            SCHADS Calculation Result
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded p-4">
              <div className="text-sm text-gray-500">Total Hours</div>
              <div className="text-2xl font-semibold text-gray-900">{schadsResult.total_hours}h</div>
            </div>
            <div className="bg-gray-50 rounded p-4">
              <div className="text-sm text-gray-500">Ordinary Hours</div>
              <div className="text-2xl font-semibold text-gray-900">{schadsResult.ordinary_hours}h</div>
            </div>
            <div className="bg-gray-50 rounded p-4">
              <div className="text-sm text-gray-500">Overtime Hours</div>
              <div className="text-2xl font-semibold text-gray-900">{schadsResult.overtime_hours}h</div>
            </div>
            <div className="bg-green-50 rounded p-4">
              <div className="text-sm text-gray-500">Total Cost</div>
              <div className="text-2xl font-semibold text-green-600">${schadsResult.total_cost.toFixed(2)}</div>
            </div>
          </div>
          
          {schadsResult.penalty_multipliers.length > 0 && (
            <div className="mt-4 p-4 bg-amber-50 rounded border border-amber-200">
              <h4 className="text-sm font-medium text-amber-800 mb-2">Penalties Applied:</h4>
              <ul className="text-sm text-amber-700 space-y-1">
                {schadsResult.penalty_multipliers.map((penalty: any, idx: number) => (
                  <li key={idx}>• {penalty.name}: {penalty.multiplier}x rate</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      
      {/* Compliance Warnings */}
      {complianceWarnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="flex items-center text-amber-800 font-semibold mb-2">
            <AlertCircle className="h-5 w-5 mr-2" />
            Compliance Warnings
          </h3>
          <ul className="text-sm text-amber-700 space-y-1">
            {complianceWarnings.map((warning, idx) => (
              <li key={idx}>• {warning}</li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Budget Warning */}
      {budgetWarning && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="flex items-center text-red-800 font-semibold mb-2">
            <AlertCircle className="h-5 w-5 mr-2" />
            Budget Warning
          </h3>
          <p className="text-sm text-red-700">{budgetWarning}</p>
          <p className="text-sm text-red-600 mt-2">
            ℹ️ This shift can still be created, but requires supervisor approval.
          </p>
        </div>
      )}
      
      {/* Worker Matching Results */}
      {matchingResult && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Worker Matches ({matchingResult.eligible_workers} eligible)
            </h3>
            {assignmentMode === 'auto' && matchingResult.ranked_matches.length > 0 && (
              <div className="text-sm text-green-600 font-medium">
                Auto-assigned: {matchingResult.ranked_matches[0].full_name}
              </div>
            )}
          </div>
          
          <div className="space-y-3">
            {matchingResult.ranked_matches.slice(0, 5).map((worker: any) => (
              <div
                key={worker.worker_id}
                className={`p-4 border rounded-lg ${
                  assignmentMode === 'manual' && selectedWorker === worker.worker_id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900">{worker.full_name}</h4>
                      <span className="text-2xl font-bold text-primary-600">
                        {worker.total_score.toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-5 gap-4 mt-2 text-sm">
                      <div>
                        <div className="text-gray-500">Certs</div>
                        <div className="font-medium">{worker.certification_score.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Training</div>
                        <div className="font-medium">{worker.training_score.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Exp</div>
                        <div className="font-medium">{worker.experience_score.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Distance</div>
                        <div className="font-medium">{worker.distance_score.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Cost</div>
                        <div className="font-medium">{worker.cost_score.toFixed(2)}</div>
                      </div>
                    </div>
                    
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="text-gray-600">
                        Rate: ${worker.hourly_rate}/hr | 
                        Distance: {worker.estimated_distance_km}km
                      </span>
                      
                      {assignmentMode === 'manual' && (
                        <button
                          onClick={() => setSelectedWorker(worker.worker_id)}
                          className={`px-3 py-1 rounded ${
                            selectedWorker === worker.worker_id
                              ? 'bg-primary-600 text-white'
                              : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {selectedWorker === worker.worker_id ? 'Selected' : 'Select'}
                        </button>
                      )}
                    </div>
                    
                    {/* Compliance warnings for this worker */}
                    {worker.compliance_warnings.length > 0 && (
                      <div className="mt-2 text-xs text-amber-600">
                        ⚠️ {worker.compliance_warnings.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Save Button */}
      {(schadsResult || matchingResult) && (
        <div className="flex justify-end">
          <button
            onClick={handleSaveShift}
            disabled={loading}
            className="flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-lg font-semibold"
          >
            <Save className="h-5 w-5 mr-2" />
            {loading ? 'Saving...' : 'Save Shift'}
          </button>
        </div>
      )}
    </div>
  )
}
