// src/pages/Dashboard.tsx

import React, { useState, useRef, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useQuery } from '@tanstack/react-query';
import { Search, TrendingUp, Calendar, DollarSign } from 'lucide-react';

import StockChart from '../components/StockChart';
import PredictionCard from '../components/PredictionCard';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  fetchCompanies,
  fetchHistoricalData,
  fetchPrediction
} from '../services/api';
import type { Company, HistoricalData, Prediction } from '../types';

const Dashboard: React.FC = () => {
  const { user } = useUser();
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear() + 1
  );
  const [searchTerm, setSearchTerm] = useState<string>('');
  const chartSectionRef = useRef<HTMLDivElement>(null);

  // Scroll to chart section when a stock is selected
  useEffect(() => {
    if (selectedCompany && chartSectionRef.current) {
      chartSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedCompany]);

  // 1. Fetch companies
  const {
    data: companies,
    isLoading: companiesLoading,
    error: companiesError
  } = useQuery<Company[], Error>({
    queryKey: ['companies'],
    queryFn: fetchCompanies
  });

  // 2. Fetch historical data
  const {
    data: historicalData,
    isLoading: histLoading,
    error: histError
  } = useQuery<HistoricalData[], Error>({
    queryKey: ['historical', selectedCompany?.ticker],
    queryFn: () =>
      selectedCompany
        ? fetchHistoricalData(selectedCompany.ticker)
        : Promise.resolve([]),
    enabled: Boolean(selectedCompany)
  });

  // 3. Fetch prediction
  const {
    data: prediction,
    isLoading: predLoading,
    error: predError
  } = useQuery<Prediction, Error>({
    queryKey: ['prediction', selectedCompany?.ticker, selectedYear],
    queryFn: () =>
      selectedCompany
        ? fetchPrediction(selectedCompany.ticker, selectedYear)
        : Promise.resolve(null as any),
    enabled: Boolean(selectedCompany && selectedYear > 0)
  });

  // Filter companies by search term
  const filteredCompanies = React.useMemo(() => {
    if (!companies) return [];
    return companies.filter((c) => {
      const term = searchTerm.toLowerCase();
      return (
        c.name.toLowerCase().includes(term) ||
        c.ticker.toLowerCase().includes(term)
      );
    });
  }, [companies, searchTerm]);

  // Future 10 years
  const futureYears = Array.from({ length: 10 }, (_, i) =>
    new Date().getFullYear() + 1 + i
  );

  if (companiesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {user?.firstName || 'User'}!
        </h1>
        <p className="text-gray-600">
          Explore stock charts and AI-powered price predictions.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border flex items-center">
          <TrendingUp className="h-8 w-8 text-blue-600" />
          <div className="ml-4">
            <p className="text-sm text-gray-600">Stocks Available</p>
            <p className="text-2xl font-semibold text-gray-900">
              {companies?.length ?? 0}
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border flex items-center">
          <Calendar className="h-8 w-8 text-green-600" />
          <div className="ml-4">
            <p className="text-sm text-gray-600">Prediction Years</p>
            <p className="text-2xl font-semibold text-gray-900">
              {new Date().getFullYear() + 1}–{new Date().getFullYear() + 10}
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border flex items-center">
          <DollarSign className="h-8 w-8 text-purple-600" />
          <div className="ml-4">
            <p className="text-sm text-gray-600">Historical Range</p>
            <p className="text-2xl font-semibold text-gray-900">5 Years</p>
          </div>
        </div>
      </div>

      {/* Stock Selection */}
      <div className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
        <h2 className="text-xl font-semibold">Select a Stock</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or ticker…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {companiesError && (
          <p className="text-red-600">Error loading companies.</p>
        )}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-60 overflow-y-auto">
          {filteredCompanies.map((c) => (
            <button
              key={c.ticker}
              onClick={() => setSelectedCompany(c)}
              className={`p-4 text-left rounded-lg border transition ${
                selectedCompany?.ticker === c.ticker
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <p className="font-semibold">{c.ticker}</p>
              <p className="text-sm text-gray-600 truncate">{c.name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Chart & Prediction */}
      {selectedCompany ? (
        <div ref={chartSectionRef} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border">
            <h3 className="text-lg font-semibold mb-4">
              {selectedCompany.name} ({selectedCompany.ticker})
            </h3>
            {histLoading ? (
              <div className="h-64 flex items-center justify-center">
                <LoadingSpinner />
              </div>
            ) : histError ? (
              <p className="text-red-600">Error loading chart data.</p>
            ) : (
              <StockChart
                data={historicalData ?? []}
              />
            )}
          </div>

          {/* Prediction */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <h4 className="text-lg font-semibold mb-4">
                Select Prediction Year
              </h4>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {futureYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <PredictionCard
              company={selectedCompany}
              year={selectedYear}
              prediction={prediction}
              isLoading={predLoading}
              error={predError}
            />
          </div>
        </div>
      ) : (
        <div className="bg-white p-12 rounded-xl shadow-sm border text-center">
          <TrendingUp className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">
            Select a stock to view chart & prediction
          </h3>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
