/**
 * navigation.js — Centralized Navigation Architecture for Sensible Document Extractor.
 * Single Source of Truth for Global Navbar, Dropdowns, and Section Groupings.
 */

export const NAV_GROUPS = [
  {
    id: 'documents',
    label: 'Documents',
    type: 'link',
    path: '/documents',
    tab: 'documents',
    description: 'Manage and review business documents & OCR extraction',
  },
  {
    id: 'insights',
    label: 'Insights',
    type: 'dropdown',
    items: [
      {
        id: 'metrics',
        label: 'Metrics Dashboard',
        path: '/metrics',
        tab: 'metrics',
        icon: 'BarChart3',
        description: 'Track extracted sustainability KPIs and consumption trends',
      },
      {
        id: 'industry-benchmarks',
        label: 'Industry Intelligence',
        path: '/benchmarks',
        tab: 'industry-benchmarks',
        icon: 'Award',
        description: 'Compare sustainability performance against sector peers',
      },
      {
        id: 'reduction-opportunities',
        label: 'Reduction Opportunities',
        path: '/reduction-opportunities',
        tab: 'reduction-opportunities',
        icon: 'Lightbulb',
        description: 'Deterministic efficiency and abatement initiatives',
      },
      {
        id: 'forecast',
        label: 'Emission Forecast',
        path: '/forecast',
        tab: 'forecast',
        icon: 'TrendingUp',
        description: 'Predictive emissions trajectories and trend modeling',
      },
      {
        id: 'reduction-intelligence',
        label: 'Reduction Intelligence',
        path: '/reduction-intelligence',
        tab: 'reduction-intelligence',
        icon: 'Target',
        description: 'Prioritized decarbonization focus and marginal abatement cost',
      },
      {
        id: 'reduction-roadmap',
        label: 'Reduction Roadmap',
        path: '/reduction-roadmap',
        tab: 'reduction-roadmap',
        icon: 'Layers',
        description: 'Time-phased net-zero roadmap with milestone tracking',
      },
      {
        id: 'emission-scenarios',
        label: 'Emission Scenarios',
        path: '/emission-scenarios',
        tab: 'emission-scenarios',
        icon: 'Sliders',
        description: 'Simulate what-if decarbonization interventions',
      },
    ],
  },
  {
    id: 'carbon',
    label: 'Carbon',
    type: 'dropdown',
    items: [
      {
        id: 'carbon-dashboard',
        label: 'Carbon Footprint',
        path: '/carbon-dashboard',
        tab: 'carbon-dashboard',
        icon: 'BarChart3',
        description: 'Scope 1, 2 & 3 emissions analytics and intensity ratios',
      },
      {
        id: 'activity-data',
        label: 'Activity Data',
        path: '/activity-data',
        tab: 'activity-data',
        icon: 'Layers',
        description: 'Normalized energy, fuel, water, and waste activity entries',
      },
      {
        id: 'emission-factors',
        label: 'Emission Factors',
        path: '/emission-factors',
        tab: 'emission-factors',
        icon: 'Database',
        description: 'Versioned greenhouse gas emission factor registry',
      },
      {
        id: 'carbon-calculations',
        label: 'Calculations',
        path: '/carbon-calculations',
        tab: 'carbon-calculations',
        icon: 'Calculator',
        description: 'Deterministic GHG calculation records with formula lineage',
      },
      {
        id: 'carbon-ledger',
        label: 'Carbon Ledger',
        path: '/carbon-ledger',
        tab: 'carbon-ledger',
        icon: 'BookOpen',
        description: 'Double-entry auditable carbon accounting journal',
      },
      {
        id: 'carbon-credit',
        label: 'Carbon Credits',
        path: '/carbon-credit',
        tab: 'carbon-credit',
        icon: 'Award',
        description: 'Carbon credit readiness and registry eligibility assessment',
      },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    type: 'dropdown',
    items: [
      {
        id: 'compliance-reports',
        label: 'Compliance Reports',
        path: '/compliance-reports',
        tab: 'compliance-reports',
        icon: 'FileText',
        description: 'Audit-ready BRSR, GHG Protocol, and CDP disclosure reports',
      },
      {
        id: 'green-finance',
        label: 'Green Finance',
        path: '/green-finance',
        tab: 'green-finance',
        icon: 'ShieldCheck',
        description: 'Green loan readiness & taxonomy alignment scoring',
      },
      {
        id: 'reduction-projects',
        label: 'Reduction Projects',
        path: '/reduction-projects',
        tab: 'reduction-projects',
        icon: 'FolderKanban',
        description: 'Measurement and verification (M&V) project tracking',
      },
    ],
  },
  {
    id: 'ai-assistant',
    label: 'AI Agent',
    type: 'link',
    path: '/agent',
    tab: 'ai-agent',
    description: 'Autonomous sustainability agent and proactive recommendations queue',
  },
];

/**
 * Returns the active group ID given the activeTab identifier.
 */
export function getActiveGroupId(activeTab) {
  if (!activeTab) return 'documents';
  if (activeTab === 'documents') return 'documents';
  if (activeTab === 'ai-agent') return 'ai-assistant';

  for (const group of NAV_GROUPS) {
    if (group.type === 'dropdown' && group.items) {
      if (group.items.some((item) => item.tab === activeTab || item.id === activeTab)) {
        return group.id;
      }
    }
  }

  // Handle sub-pages
  if (activeTab.startsWith('compliance-report')) return 'reports';
  if (activeTab.startsWith('green-finance')) return 'reports';
  if (activeTab.startsWith('carbon-credit')) return 'carbon';

  return null;
}
