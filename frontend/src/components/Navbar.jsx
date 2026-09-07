import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  BarChart3,
  Activity,
  X,
  ShieldCheck,
  Database,
  Cpu,
  Sparkles,
  Layers,
  Calculator,
  BookOpen,
  Lightbulb,
  FolderKanban,
  Award,
  TrendingUp,
  Target,
  Sliders,
  ChevronDown,
  Menu,
  FileSpreadsheet,
  CheckCircle2,
  Bot,
  ExternalLink,
  HelpCircle,
  FileCheck,
  Clock
} from 'lucide-react';
import { NAV_GROUPS, getActiveGroupId } from '../config/navigation';

// Icon Map for dynamic icons in dropdown items
const ICON_MAP = {
  FileText,
  BarChart3,
  Award,
  Lightbulb,
  TrendingUp,
  Target,
  Layers,
  Sliders,
  Database,
  Calculator,
  BookOpen,
  ShieldCheck,
  FolderKanban,
  Sparkles,
  Clock,
  CheckCircle2,
  Activity
};

export default function Navbar({
  activeTab,
  onSelectTab,
  health,
  onSeedSample,
  isSeeding,
  onOpenAiDrawer
}) {
  const [openDropdown, setOpenDropdown] = useState(null);
  const [showSampleDropdown, setShowSampleDropdown] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileExpandedGroup, setMobileExpandedGroup] = useState(null);

  const navRef = useRef(null);
  const activeGroupId = getActiveGroupId(activeTab);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setOpenDropdown(null);
        setShowSampleDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdowns on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpenDropdown(null);
        setShowSampleDropdown(false);
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNavClick = (item) => {
    setOpenDropdown(null);
    setMobileMenuOpen(false);
    if (item.isAction && item.actionType === 'OPEN_AI_DRAWER') {
      if (onOpenAiDrawer) onOpenAiDrawer();
      return;
    }
    onSelectTab(item.tab || item.id, item.statusFilter);
  };

  const handleGroupToggle = (groupId) => {
    setOpenDropdown((prev) => (prev === groupId ? null : groupId));
    setShowSampleDropdown(false);
  };

  return (
    <header ref={navRef} className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          
          {/* Brand & Left Navigation */}
          <div className="flex items-center space-x-6 min-w-0">
            {/* Logo */}
            <div
              onClick={() => onSelectTab('documents')}
              className="flex items-center space-x-2.5 cursor-pointer select-none shrink-0 group"
            >
              <div className="w-7 h-7 rounded-md bg-[#0F6B56] text-white flex items-center justify-center font-bold text-sm shadow-2xs group-hover:bg-[#0c5947] transition-colors">
                S
              </div>
              <span className="font-bold text-slate-900 text-sm tracking-tight hidden sm:inline">
                Senseible Document Extractor
              </span>
            </div>

            {/* Desktop Navigation Groups */}
            <nav className="hidden md:flex items-center space-x-1">
              {NAV_GROUPS.map((group) => {
                const isGroupActive = activeGroupId === group.id;
                const isDropdownOpen = openDropdown === group.id;

                if (!group.hasDropdown) {
                  const IconComponent = typeof group.icon === 'function' ? group.icon : (ICON_MAP[group.icon] || null);
                  return (
                    <button
                      key={group.id}
                      onClick={() => handleNavClick(group)}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                        isGroupActive
                          ? 'bg-[#EAF7F2] text-[#0F6B56]'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      {IconComponent && <IconComponent className="w-3.5 h-3.5" />}
                      <span>{group.label}</span>
                    </button>
                  );
                }

                return (
                  <div key={group.id} className="relative">
                    <div className="flex items-center">
                      <button
                        onClick={() => {
                          if (group.tab) {
                            handleNavClick({ tab: group.tab, path: group.path });
                          } else {
                            handleGroupToggle(group.id);
                          }
                        }}
                        className={`px-2.5 py-1.5 rounded-l-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                          isGroupActive
                            ? 'bg-[#EAF7F2] text-[#0F6B56]'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        {group.id === 'documents' && <FileText className="w-3.5 h-3.5" />}
                        <span>{group.label}</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGroupToggle(group.id);
                        }}
                        className={`px-1.5 py-1.5 rounded-r-md text-xs font-semibold transition-colors ${
                          isGroupActive
                            ? 'bg-[#EAF7F2] text-[#0F6B56]'
                            : isDropdownOpen
                            ? 'bg-slate-100 text-slate-900'
                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                        aria-expanded={isDropdownOpen}
                        title={`Open ${group.label} menu`}
                      >
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform duration-150 ${
                            isDropdownOpen ? 'rotate-180 text-slate-900' : 'text-slate-400'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Dropdown Menu */}
                    {isDropdownOpen && (
                      <div className="absolute left-0 top-full mt-1.5 w-80 bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-1.5 animate-dropdown space-y-0.5">
                        {group.items.map((item) => {
                          const isItemActive = activeTab === item.tab || activeTab === item.id;
                          const IconComponent = typeof item.icon === 'function' ? item.icon : (ICON_MAP[item.icon] || FileText);

                          return (
                            <button
                              key={item.id}
                              onClick={() => handleNavClick(item)}
                              className={`w-full text-left p-2 rounded-lg transition-colors flex items-start space-x-2.5 ${
                                isItemActive
                                  ? 'bg-[#EAF7F2] text-[#0F6B56]'
                                  : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <div
                                className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                                  isItemActive
                                    ? 'bg-white text-[#0F6B56] shadow-2xs'
                                    : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                <IconComponent className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-semibold flex items-center justify-between">
                                  <span className="truncate">{item.label}</span>
                                  <div className="flex items-center space-x-1 shrink-0 ml-1.5">
                                    {item.badge && (
                                      <span
                                        className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                                          item.badgeColor === 'emerald'
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : item.badgeColor === 'amber'
                                            ? 'bg-amber-100 text-amber-800'
                                            : 'bg-slate-100 text-slate-700'
                                        }`}
                                      >
                                        {item.badge}
                                      </span>
                                    )}
                                    {isItemActive && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-[#0F6B56]" />
                                    )}
                                  </div>
                                </div>
                                {item.description && (
                                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                    {item.description}
                                  </p>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>

          {/* Right Controls */}
          <div className="flex items-center space-x-2.5 shrink-0">
            {/* Sample PDFs Dropdown */}
            {onSeedSample && (
              <div className="relative">
                <button
                  onClick={() => {
                    setShowSampleDropdown(!showSampleDropdown);
                    setOpenDropdown(null);
                  }}
                  disabled={isSeeding}
                  className="px-2.5 py-1.5 rounded-md border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors flex items-center space-x-1.5 disabled:opacity-50"
                  title="Generate sample sustainability documents"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden lg:inline">Sample PDFs</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {showSampleDropdown && (
                  <div className="absolute right-0 top-full mt-1.5 w-56 bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-1.5 animate-dropdown space-y-1">
                    <div className="px-2 py-1 text-[10px] font-semibold uppercase text-slate-400">
                      Seed Demo Documents
                    </div>
                    <button
                      onClick={() => {
                        setShowSampleDropdown(false);
                        onSeedSample('electricity');
                      }}
                      disabled={isSeeding}
                      className="w-full text-left p-2 rounded-lg hover:bg-slate-50 text-xs text-slate-700 flex items-center space-x-2"
                    >
                      <div className="w-5 h-5 rounded bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        ⚡
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">Electricity Bill</div>
                        <div className="text-[10px] text-slate-500">Tata Power 48,750 kWh</div>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        setShowSampleDropdown(false);
                        onSeedSample('esg');
                      }}
                      disabled={isSeeding}
                      className="w-full text-left p-2 rounded-lg hover:bg-slate-50 text-xs text-slate-700 flex items-center space-x-2"
                    >
                      <div className="w-5 h-5 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        🌱
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">ESG Audit Report</div>
                        <div className="text-[10px] text-slate-500">Scope 1 & 2 verified metrics</div>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        setShowSampleDropdown(false);
                        onSeedSample('scanned');
                      }}
                      disabled={isSeeding}
                      className="w-full text-left p-2 rounded-lg hover:bg-slate-50 text-xs text-slate-700 flex items-center space-x-2"
                    >
                      <div className="w-5 h-5 rounded bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        📄
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">Waste Manifest</div>
                        <div className="text-[10px] text-slate-500">Scanned OCR hazardous waste</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* System Status Pill */}
            <button
              onClick={() => setShowStatusModal(true)}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all text-xs"
              title="View system status"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-slate-600 font-medium hidden sm:inline text-xs">
                System Online
              </span>
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 md:hidden"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3 animate-dropdown max-h-[85vh] overflow-y-auto">
          {/* Navigation Groups */}
          <div className="space-y-1">
            {NAV_GROUPS.map((group) => {
              if (group.type === 'link') {
                const isActive = activeGroupId === group.id || activeTab === group.tab;
                const IconComponent = typeof group.icon === 'function' ? group.icon : (ICON_MAP[group.icon] || null);
                return (
                  <button
                    key={group.id}
                    onClick={() => handleNavClick(group)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-between ${
                      isActive ? 'bg-[#EAF7F2] text-[#0F6B56]' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      {IconComponent && <IconComponent className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
                      <span>{group.label}</span>
                    </div>
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#0F6B56]" />}
                  </button>
                );
              }

              const isExpanded = mobileExpandedGroup === group.id;
              const isGroupActive = activeGroupId === group.id;

              return (
                <div key={group.id} className="border border-slate-100 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setMobileExpandedGroup(isExpanded ? null : group.id)}
                    className={`w-full text-left px-3 py-2.5 text-xs font-semibold flex items-center justify-between ${
                      isGroupActive ? 'text-[#0F6B56] bg-[#EAF7F2]/50' : 'text-slate-800'
                    }`}
                  >
                    <span>{group.label}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>

                  {isExpanded && (
                    <div className="bg-slate-50 px-2 py-1.5 space-y-1">
                      {group.items.map((item) => {
                        const isItemActive = activeTab === item.tab || activeTab === item.id;
                        const IconComponent = typeof item.icon === 'function' ? item.icon : (ICON_MAP[item.icon] || FileText);

                        return (
                          <button
                            key={item.id}
                            onClick={() => handleNavClick(item)}
                            className={`w-full text-left p-2 rounded-md text-xs flex items-center space-x-2 ${
                              isItemActive
                                ? 'bg-[#EAF7F2] text-[#0F6B56] font-semibold'
                                : 'text-slate-700 hover:bg-white'
                            }`}
                          >
                            <IconComponent className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span className="truncate">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* System Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-xl max-w-sm w-full p-5 shadow-xl space-y-4 animate-dropdown">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-[#0F6B56]" />
                <h3 className="text-sm font-bold text-slate-900">System Status</h3>
              </div>
              <button
                onClick={() => setShowStatusModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center space-x-2 text-slate-700">
                  <Cpu className="w-3.5 h-3.5 text-slate-500" />
                  <span>Backend API Service</span>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Healthy
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center space-x-2 text-slate-700">
                  <Database className="w-3.5 h-3.5 text-slate-500" />
                  <span>SQLite Database</span>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Connected
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center space-x-2 text-slate-700">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                  <span>Deterministic OCR Engine</span>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  PyMuPDF / Tesseract
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center space-x-2 text-slate-700">
                  <Sparkles className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copilot / LLM Service</span>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  {health?.openai_configured ? 'Configured (Live)' : 'Deterministic Active'}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowStatusModal(false)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
