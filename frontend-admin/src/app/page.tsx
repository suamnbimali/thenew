'use client'

import { useState, useEffect } from 'react'
import PocketBase from 'pocketbase'
import pb from '@/lib/pocketbase'
import { Calendar, Users, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react'

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalShifts: 0,
    activeWorkers: 0,
    budgetUtilization: 0,
    complianceAlerts: 0
  })

  useEffect(() => {
    // Fetch dashboard stats from PocketBase
    // This will be implemented once PocketBase is initialized
  }, [])

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-primary-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">N</span>
                </div>
              </div>
              <div className="ml-4">
                <h1 className="text-xl font-semibold text-gray-900">
                  NDIS Rostering Platform
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">Welcome, Admin</span>
              <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 text-sm font-medium">
                A
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <a href="/" className="border-b-2 border-primary-500 py-4 px-1 text-sm font-medium text-primary-600">
              Dashboard
            </a>
            <a href="/rostering" className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300">
              Rostering
            </a>
            <a href="/workers" className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300">
              Workers
            </a>
            <a href="/participants" className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300">
              Participants
            </a>
            <a href="/compliance" className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300">
              Compliance
            </a>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Dashboard Overview
          </h2>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Shifts */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Calendar className="h-6 w-6 text-primary-500" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Shifts Today
                      </dt>
                      <dd className="text-3xl font-semibold text-gray-900">
                        {stats.totalShifts}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Workers */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Users className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Active Workers
                      </dt>
                      <dd className="text-3xl font-semibold text-gray-900">
                        {stats.activeWorkers}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Budget Utilization */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <DollarSign className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Budget Utilization
                      </dt>
                      <dd className="text-3xl font-semibold text-gray-900">
                        {stats.budgetUtilization}%
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Compliance Alerts */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-6 w-6 text-amber-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Compliance Alerts
                      </dt>
                      <dd className="text-3xl font-semibold text-gray-900">
                        {stats.complianceAlerts}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* System Status */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-5 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                System Status
              </h3>
            </div>
            <div className="px-6 py-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">PocketBase</div>
                    <div className="text-xs text-gray-500">Connected</div>
                  </div>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">SCHADS Engine</div>
                    <div className="text-xs text-gray-500">Ready</div>
                  </div>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Matching Engine</div>
                    <div className="text-xs text-gray-500">Ready</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
