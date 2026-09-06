import React, { useState } from 'react';
import {
  Plus,
  Search,
  X,
  Filter,
  SlidersHorizontal,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import UploadDocument from '../components/UploadDocument';
import DocumentTable from '../components/DocumentTable';

export default function Documents({
  documents = [],
  totalDocs = 0,
  page = 1,
  setPage,
  limit = 10,
  setLimit,
  searchTerm = '',
  setSearchTerm,
  statusFilter = '',
  setStatusFilter,
  onSelectDocument,
  onDeleteDocument,
  onReprocessDocument,
  onRefresh,
  isRefreshing,
  loadingActionId
}) {
  const [showUpload, setShowUpload] = useState(false);
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('');

  // Compute live counts
  const readyCount = documents.filter((d) => d.review_status === 'COMPLETED' || d.status === 'COMPLETED').length;
  const needsReviewCount = documents.filter((d) => d.review_status === 'NEEDS_REVIEW').length;
  const verifiedCount = documents.filter((d) => d.review_status === 'VERIFIED').length;

  const statusTabs = [
    { label: 'All', count: totalDocs || documents.length, value: '' },
    { label: 'Needs Review', count: needsReviewCount, value: 'NEEDS_REVIEW' },
    { label: 'Ready', count: readyCount, value: 'COMPLETED' },
    { label: 'Verified', count: verifiedCount, value: 'VERIFIED' },
  ];

  // Distinct document types in current list for filter popover
  const availableDocTypes = Array.from(
    new Set(documents.map((d) => d.document_type).filter(Boolean))
  );

  // Client-side filtering if type filter active
  const filteredDocuments = selectedTypeFilter
    ? documents.filter((d) => d.document_type === selectedTypeFilter)
    : documents;

  const handleUploadSuccess = (newDoc) => {
    setShowUpload(false);
    onRefresh();
    if (newDoc) {
      onSelectDocument(newDoc);
    }
  };

  const handleClearFilters = () => {
    setStatusFilter('');
    setSearchTerm('');
    setSelectedTypeFilter('');
    if (setPage) setPage(1);
    setShowFilterPopover(false);
  };

  const hasActiveFilters = Boolean(statusFilter || searchTerm || selectedTypeFilter);

  return (
    <div className="space-y-6 pb-12 w-full">
      
      {/* 1. TOP HEADER & MAIN ACTION */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Documents</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage and review business documents, verification workflows, and OCR extracted metrics.
          </p>
        </div>

        <button
          onClick={() => setShowUpload(!showUpload)}
          className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-[#0F6B56] hover:bg-[#0c5947] text-white rounded-xl text-xs font-semibold transition-all shadow-xs hover:shadow-sm self-start sm:self-auto shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{showUpload ? 'Close Upload' : 'Upload Document'}</span>
        </button>
      </div>

      {/* Expandable Upload Panel */}
      {showUpload && (
        <div className="animate-dropdown">
          <UploadDocument
            onUploadSuccess={handleUploadSuccess}
            onCancel={() => setShowUpload(false)}
          />
        </div>
      )}

      {/* 2. STATUS PILLS, SEARCH & FILTER ROW */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
        
        {/* Status Filter Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 lg:pb-0 no-scrollbar">
          {statusTabs.map((tab) => {
            const isActive = statusFilter === tab.value;
            return (
              <button
                key={tab.label}
                onClick={() => {
                  setStatusFilter(tab.value);
                  if (setPage) setPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex items-center space-x-1.5 border ${
                  isActive
                    ? 'bg-[#0F6B56] text-white border-[#0F6B56] shadow-2xs font-semibold'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[11px] px-1.5 py-0.2 rounded-full ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 text-slate-500 font-normal'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Filter Popover */}
        <div className="flex items-center space-x-2 w-full lg:w-auto">
          {/* Search Box */}
          <div className="relative flex-1 lg:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (setPage) setPage(1);
              }}
              placeholder="Search documents or companies..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0F6B56] focus:ring-1 focus:ring-[#0F6B56] shadow-2xs transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  if (setPage) setPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Popover Trigger */}
          <div className="relative">
            <button
              onClick={() => setShowFilterPopover(!showFilterPopover)}
              className={`px-3 py-2 rounded-xl border text-xs font-medium transition-all flex items-center space-x-1.5 shadow-2xs ${
                selectedTypeFilter
                  ? 'bg-[#EAF7F2] text-[#0F6B56] border-[#c4eedf] font-semibold'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
              }`}
              title="Filter by document type"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Filter</span>
              {selectedTypeFilter && (
                <span className="w-2 h-2 rounded-full bg-[#0F6B56]" />
              )}
            </button>

            {/* Filter Popover Content */}
            {showFilterPopover && (
              <div className="absolute right-0 top-full mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-30 p-3 animate-dropdown space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-slate-900">Filter Documents</span>
                  {hasActiveFilters && (
                    <button
                      onClick={handleClearFilters}
                      className="text-[11px] text-[#0F6B56] hover:underline flex items-center space-x-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>

                {/* Document Type Selector */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Document Type
                  </label>
                  <select
                    value={selectedTypeFilter}
                    onChange={(e) => setSelectedTypeFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#0F6B56]"
                  >
                    <option value="">All Document Types</option>
                    {availableDocTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-2 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => setShowFilterPopover(false)}
                    className="px-3 py-1.5 bg-[#0F6B56] text-white text-xs font-semibold rounded-lg hover:bg-[#0c5947] transition-colors"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Reset Filters Shortcut */}
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
              title="Clear all filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

      </div>

      {/* 3. MAIN DOCUMENT TABLE */}
      <DocumentTable
        documents={filteredDocuments}
        totalDocs={totalDocs}
        page={page}
        setPage={setPage}
        limit={limit}
        setLimit={setLimit}
        onSelectDocument={onSelectDocument}
        onDeleteDocument={onDeleteDocument}
        onReprocessDocument={onReprocessDocument}
        onOpenUpload={() => setShowUpload(true)}
        loadingActionId={loadingActionId}
      />

    </div>
  );
}
