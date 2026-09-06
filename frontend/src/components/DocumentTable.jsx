import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Eye,
  Trash2,
  RefreshCw,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldCheck,
  Zap,
  Leaf
} from 'lucide-react';

export default function DocumentTable({
  documents = [],
  totalDocs = 0,
  page = 1,
  setPage,
  limit = 10,
  setLimit,
  onSelectDocument,
  onDeleteDocument,
  onReprocessDocument,
  onOpenUpload,
  loadingActionId
}) {
  const [activeMenuId, setActiveMenuId] = useState(null);
  const menuRef = useRef(null);

  // Close 3-dot menu on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getStatusBadge = (doc) => {
    const status = doc.status;
    const reviewStatus = doc.review_status;

    if (status === 'PROCESSING' || status === 'RUNNING_OCR' || status === 'RUNNING_LLM') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
          Processing
        </span>
      );
    }
    if (status === 'FAILED') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          Failed
        </span>
      );
    }
    if (reviewStatus === 'VERIFIED') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
          Verified
        </span>
      );
    }
    if (reviewStatus === 'NEEDS_REVIEW') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          <AlertCircle className="w-3 h-3 mr-1 text-amber-600" />
          Needs Review
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
        Ready
      </span>
    );
  };

  const getQualityLabel = (score) => {
    if (score == null) return null;
    if (score >= 90) return { text: 'Excellent', color: 'text-emerald-700' };
    if (score >= 80) return { text: 'High confidence', color: 'text-emerald-600' };
    if (score >= 60) return { text: 'Needs review', color: 'text-amber-600' };
    return { text: 'Low confidence', color: 'text-rose-600' };
  };

  const formatRelativeTime = (dateString) => {
    if (!dateString) return 'Just now';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMin = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMin < 2) return 'Just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;

      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Recent';
    }
  };

  const totalPages = Math.ceil(totalDocs / limit) || 1;
  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, totalDocs);

  if (documents.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-4 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
          <FileText className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-900">No documents found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Upload your first electricity bill, fuel receipt, water bill, or waste manifest to begin automated sustainability extraction.
          </p>
        </div>
        <div className="pt-2">
          <button
            onClick={onOpenUpload}
            className="px-4 py-2 bg-[#0F6B56] hover:bg-[#0c5947] text-white text-xs font-semibold rounded-xl transition-colors shadow-xs inline-flex items-center space-x-1.5"
          >
            <span>Upload Document</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
      
      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4">Document</th>
              <th className="py-3 px-3">Type</th>
              <th className="py-3 px-3">Reporting Period</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3">Quality</th>
              <th className="py-3 px-3">Uploaded</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {documents.map((doc) => {
              const quality = doc.quality_score != null ? Math.round(doc.quality_score) : null;
              const qualityInfo = getQualityLabel(quality);
              const period = doc.reporting_period || doc.structured_data?.period?.billing_month || '—';
              const docType = doc.document_type || 'Utility Bill';
              const isSample = doc.original_filename?.toLowerCase().includes('sample') || doc.filename?.toLowerCase().includes('sample');
              const isActionLoading = loadingActionId === doc.id;

              return (
                <tr 
                  key={doc.id}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  onClick={() => onSelectDocument(doc)}
                >
                  {/* Document Column */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 border border-slate-200 group-hover:bg-[#EAF7F2] group-hover:text-[#0F6B56] group-hover:border-[#c4eedf] transition-colors">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 max-w-xs sm:max-w-sm">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-slate-900 truncate block group-hover:text-[#0F6B56] transition-colors">
                            {doc.original_filename || doc.filename}
                          </span>
                          {isSample && (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-semibold bg-slate-100 text-slate-500 border border-slate-200 shrink-0">
                              DEMO
                            </span>
                          )}
                        </div>
                        {doc.company_name && (
                          <span className="text-[11px] text-slate-400 truncate block mt-0.5">
                            {doc.company_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Type Column */}
                  <td className="py-3.5 px-3">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200/80 inline-block">
                      {docType}
                    </span>
                  </td>

                  {/* Reporting Period Column */}
                  <td className="py-3.5 px-3 text-slate-600 font-medium">
                    {period}
                  </td>

                  {/* Status Badge Column */}
                  <td className="py-3.5 px-3">
                    {getStatusBadge(doc)}
                  </td>

                  {/* Quality Score Column */}
                  <td className="py-3.5 px-3">
                    {quality != null ? (
                      <div>
                        <div className="font-bold text-slate-900">
                          {quality} <span className="text-slate-400 font-normal text-[11px]">/ 100</span>
                        </div>
                        {qualityInfo && (
                          <span className={`text-[10px] font-medium block ${qualityInfo.color}`}>
                            {qualityInfo.text}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  {/* Uploaded Timestamp Column */}
                  <td className="py-3.5 px-3 text-slate-500 whitespace-nowrap">
                    {formatRelativeTime(doc.created_at)}
                  </td>

                  {/* Action Column */}
                  <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end space-x-1.5">
                      <button
                        onClick={() => onSelectDocument(doc)}
                        className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs font-semibold transition-colors shadow-2xs hover:border-slate-300"
                      >
                        View
                      </button>

                      {/* 3-Dot Action Menu */}
                      <div className="relative" ref={activeMenuId === doc.id ? menuRef : null}>
                        <button
                          onClick={() => setActiveMenuId(activeMenuId === doc.id ? null : doc.id)}
                          disabled={isActionLoading}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          title="More options"
                        >
                          {isActionLoading ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#0F6B56]" />
                          ) : (
                            <MoreVertical className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {activeMenuId === doc.id && (
                          <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1 text-xs text-slate-700 animate-dropdown space-y-0.5">
                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                onSelectDocument(doc);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center space-x-2 text-slate-700"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-400" />
                              <span>View Detail</span>
                            </button>

                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                onReprocessDocument(doc.id, false);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center space-x-2 text-slate-700"
                            >
                              <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                              <span>Reprocess OCR</span>
                            </button>

                            <div className="border-t border-slate-100 my-1" />

                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                onDeleteDocument(doc.id);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-600 flex items-center space-x-2 font-medium"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                              <span>Delete Document</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Table Pagination Footer */}
      {totalDocs > 0 && (
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing <span className="font-semibold text-slate-800">{startItem}</span> to{' '}
            <span className="font-semibold text-slate-800">{endItem}</span> of{' '}
            <span className="font-semibold text-slate-800">{totalDocs}</span> documents
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage && setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 transition-colors shadow-2xs"
              title="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-2 font-semibold text-slate-700">
              Page {page} of {totalPages}
            </span>

            <button
              onClick={() => setPage && setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 transition-colors shadow-2xs"
              title="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
