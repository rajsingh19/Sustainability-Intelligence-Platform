import {
  FileText,
  BarChart3,
  TrendingUp,
  Target,
  Layers,
  Sliders,
  Sparkles,
  Lightbulb,
  Database,
  Activity,
  Calculator,
  BookOpen,
  Award,
  ShieldCheck,
  FolderKanban,
  CheckCircle2,
  Clock,
  MessageSquare
} from 'lucide-react';

export const NAVIGATION_GROUPS = [
  {
    id: 'documents',
    label: 'Documents',
    tab: 'documents',
    path: '/documents',
    icon: FileText,
    hasDropdown: true,
    children: [
      {
        id: 'all-docs',
        label: 'All Documents',
        description: 'Complete inventory of uploaded invoices, bills, and audits',
        tab: 'documents',
        path: '/documents',
        statusFilter: '',
        icon: FileText,
      },
      {
        id: 'needs-review',
        label: 'Needs Review',
        description: 'Documents with low confidence extractions requiring verification',
        tab: 'documents',
        path: '/documents',
        statusFilter: 'NEEDS_REVIEW',
        icon: Clock,
        badge: 'Review',
        badgeColor: 'amber',
      },
      {
        id: 'ready-docs',
        label: 'Ready Documents',
        description: 'Extracted documents ready for carbon accounting posting',
        tab: 'documents',
        path: '/documents',
        statusFilter: 'COMPLETED',
        icon: CheckCircle2,
      },
      {
        id: 'verified-docs',
        label: 'Verified Records',
        description: 'Auditor-verified and evidence-backed records',
        tab: 'documents',
        path: '/documents',
        statusFilter: 'VERIFIED',
        icon: ShieldCheck,
      }
    ]
  },
  {
    id: 'insights',
    label: 'Insights',
    hasDropdown: true,
    children: [
      {
        id: 'metrics',
        label: 'Platform Metrics',
        description: 'High-level sustainability statistics and document volumes',
        tab: 'metrics',
        path: '/metrics',
        icon: BarChart3,
      },
      {
        id: 'industry-benchmarks',
        label: 'Industry Intelligence',
        description: 'Sector benchmarks, peer percentiles, and gap analysis',
        tab: 'industry-benchmarks',
        path: '/benchmarks',
        icon: BarChart3,
      },
      {
        id: 'reduction-opportunities',
        label: 'Reduction Opportunities',
        description: 'Deterministic operational focus areas ranked by ROI',
        tab: 'reduction-opportunities',
        path: '/reduction-opportunities',
        icon: Lightbulb,
      },
      {
        id: 'forecast',
        label: 'Emission Forecast',
        description: 'Rolling linear extrapolations and historical projection models',
        tab: 'forecast',
        path: '/forecast',
        icon: TrendingUp,
      },
      {
        id: 'reduction-intelligence',
        label: 'Reduction Intelligence',
        description: 'Prioritized mitigation strategies and operational focus rankings',
        tab: 'reduction-intelligence',
        path: '/reduction-intelligence',
        icon: Target,
      },
      {
        id: 'reduction-roadmap',
        label: 'Reduction Roadmap',
        description: 'Targeted multi-phase milestone plan with payback estimates',
        tab: 'reduction-roadmap',
        path: '/reduction-roadmap',
        icon: Layers,
      },
      {
        id: 'emission-scenarios',
        label: 'What-If Scenarios',
        description: 'Renewable switch and energy efficiency scenario models',
        tab: 'emission-scenarios',
        path: '/emission-scenarios',
        icon: Sliders,
      }
    ]
  },
  {
    id: 'carbon',
    label: 'Carbon',
    hasDropdown: true,
    children: [
      {
        id: 'carbon-dashboard',
        label: 'Carbon Footprint',
        description: 'Deterministic analytics and Scope 1, 2, 3 footprint breakdown',
        tab: 'carbon-dashboard',
        path: '/carbon-dashboard',
        icon: BarChart3,
      },
      {
        id: 'activity-data',
        label: 'Activity Data',
        description: 'Normalized consumption metrics and evidence anchors',
        tab: 'activity-data',
        path: '/activity-data',
        icon: Activity,
      },
      {
        id: 'emission-factors',
        label: 'Emission Factors',
        description: 'Governed emission factor registry with regional standards',
        tab: 'emission-factors',
        path: '/emission-factors',
        icon: Database,
      },
      {
        id: 'carbon-calculations',
        label: 'Calculations Engine',
        description: 'Transparent quantity × factor formulas and unit conversions',
        tab: 'carbon-calculations',
        path: '/carbon-calculations',
        icon: Calculator,
      },
      {
        id: 'carbon-ledger',
        label: 'Carbon Ledger',
        description: 'Double-entry auditable ledger with immutable posted entries',
        tab: 'carbon-ledger',
        path: '/carbon-ledger',
        icon: BookOpen,
      },
      {
        id: 'carbon-credit',
        label: 'Carbon Credit Readiness',
        description: 'Standards alignment score, MRV checklist, and gap detection',
        tab: 'carbon-credit',
        path: '/carbon-credit',
        icon: Award,
      }
    ]
  },
  {
    id: 'reports',
    label: 'Reports',
    hasDropdown: true,
    children: [
      {
        id: 'compliance-reports',
        label: 'Compliance Reports',
        description: 'GHG Protocol, BRSR, GRI, and CBAM regulatory disclosure builder',
        tab: 'compliance-reports',
        path: '/compliance-reports',
        icon: FileText,
      },
      {
        id: 'green-finance',
        label: 'Green Finance Eligibility',
        description: 'Taxonomy eligibility assessment and green lending preparation',
        tab: 'green-finance',
        path: '/green-finance',
        icon: ShieldCheck,
      },
      {
        id: 'reduction-projects',
        label: 'Reduction Projects',
        description: 'Capital projects tracking, verification, and measurement',
        tab: 'reduction-projects',
        path: '/reduction-projects',
        icon: FolderKanban,
      }
    ]
  },
  {
    id: 'agent',
    label: 'Agent',
    tab: 'ai-agent',
    path: '/agent',
    icon: Sparkles,
    hasDropdown: false
  }
];

export const SAMPLE_DOCUMENTS = [
  { id: 'electricity', label: 'Electricity Bill', type: 'electricity' },
  { id: 'esg', label: 'ESG Audit Report', type: 'esg' },
  { id: 'scanned', label: 'Waste Manifest', type: 'scanned' }
];

export const isTabActiveInGroup = (group, activeTab) => {
  if (group.tab && group.tab === activeTab) return true;
  if (group.children) {
    return group.children.some(child => child.tab === activeTab);
  }
  return false;
};

export const NAV_GROUPS = NAVIGATION_GROUPS.map(group => ({
  ...group,
  type: group.hasDropdown ? 'dropdown' : 'link',
  items: group.children || []
}));

export const getActiveGroupId = (activeTab) => {
  if (!activeTab) return 'documents';
  for (const group of NAVIGATION_GROUPS) {
    if (group.tab === activeTab || group.id === activeTab) return group.id;
    if (group.children) {
      for (const child of group.children) {
        if (child.tab === activeTab || child.id === activeTab) {
          return group.id;
        }
      }
    }
  }
  return 'documents';
};

