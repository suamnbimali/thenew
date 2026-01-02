'use client'

import ShiftCreateForm from '@/components/ShiftCreateForm'
import { Calendar, Plus, List } from 'lucide-react'

export default function RosteringPage() {
  // TODO: Get business ID from auth context
  const businessId = 'demo-business-id'

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Rostering</h1>
            <p className="text-gray-500 mt-1">Create and manage shifts with AI-powered worker matching</p>
          </div>
          <div className="flex space-x-3">
            <button className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
              <List className="h-4 w-4 mr-2" />
              View All Shifts
            </button>
            <button className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">
              <Plus className="h-4 w-4 mr-2" />
              Create Shift
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Create Shift Form */}
        <ShiftCreateForm businessId={businessId} />
      </main>
    </div>
  )
}
