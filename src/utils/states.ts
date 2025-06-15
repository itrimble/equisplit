import { USState, PropertyRegime } from '@/types';

// Community property states
export const COMMUNITY_PROPERTY_STATES: USState[] = [
  'AZ', 'CA', 'ID', 'LA', 'NV', 'NM', 'TX', 'WA', 'WI'
];

// State information
export const STATE_INFO: Record<USState, {
  name: string;
  propertyRegime: PropertyRegime;
  isQCPState?: boolean; // <-- Add this line
  equitableFactors?: string[];
  specialRules?: string[];
}> = {
  'AL': { name: 'Alabama', propertyRegime: 'equitable' },
  'AK': { name: 'Alaska', propertyRegime: 'equitable' },
  'AZ': { 
    name: 'Arizona', 
    propertyRegime: 'community',
    isQCPState: true, // <-- Add this line
    specialRules: ['Quasi-community property rules apply to out-of-state assets']
  },
  'AR': { name: 'Arkansas', propertyRegime: 'equitable' },
  'CA': { 
    name: 'California', 
    propertyRegime: 'community',
    isQCPState: true, // <-- Add this line
    specialRules: [
      'Income from separate property remains separate',
      'Putative spouse doctrine applies',
      'Strict 50/50 division unless agreement'
    ]
  },
  'CO': { name: 'Colorado', propertyRegime: 'equitable' },
  'CT': { name: 'Connecticut', propertyRegime: 'equitable' },
  'DE': { name: 'Delaware', propertyRegime: 'equitable' },
  'FL': { name: 'Florida', propertyRegime: 'equitable' },
  'GA': { name: 'Georgia', propertyRegime: 'equitable' },
  'HI': { name: 'Hawaii', propertyRegime: 'equitable' },
  'ID': { 
    name: 'Idaho', 
    propertyRegime: 'community',
    isQCPState: true, // <-- Add this line
    specialRules: ['Community property with right of survivorship available']
  },
  'IL': { name: 'Illinois', propertyRegime: 'equitable' },
  'IN': { name: 'Indiana', propertyRegime: 'equitable' },
  'IA': { name: 'Iowa', propertyRegime: 'equitable' },
  'KS': { name: 'Kansas', propertyRegime: 'equitable' },
  'KY': { name: 'Kentucky', propertyRegime: 'equitable' },
  'LA': { 
    name: 'Louisiana', 
    propertyRegime: 'community',
    specialRules: [
      'Civil law system with unique property concepts',
      'Separate property includes gifts and inheritances'
    ]
  },
  'ME': { name: 'Maine', propertyRegime: 'equitable' },
  'MD': { name: 'Maryland', propertyRegime: 'equitable' },
  'MA': { name: 'Massachusetts', propertyRegime: 'equitable' },
  'MI': { name: 'Michigan', propertyRegime: 'equitable' },
  'MN': { name: 'Minnesota', propertyRegime: 'equitable' },
  'MS': { name: 'Mississippi', propertyRegime: 'equitable' },
  'MO': { name: 'Missouri', propertyRegime: 'equitable' },
  'MT': { name: 'Montana', propertyRegime: 'equitable' },
  'NE': { name: 'Nebraska', propertyRegime: 'equitable' },
  'NV': { 
    name: 'Nevada', 
    propertyRegime: 'community',
    specialRules: ['Allows for unequal division in cases of economic fault']
  },
  'NH': { name: 'New Hampshire', propertyRegime: 'equitable' },
  'NJ': { name: 'New Jersey', propertyRegime: 'equitable' },
  'NM': { 
    name: 'New Mexico', 
    propertyRegime: 'community',
    specialRules: ['Judicial discretion allowed for unequal division']
  },
  'NY': { name: 'New York', propertyRegime: 'equitable' },
  'NC': { name: 'North Carolina', propertyRegime: 'equitable' },
  'ND': { name: 'North Dakota', propertyRegime: 'equitable' },
  'OH': { name: 'Ohio', propertyRegime: 'equitable' },
  'OK': { name: 'Oklahoma', propertyRegime: 'equitable' },
  'OR': { name: 'Oregon', propertyRegime: 'equitable' },
  'PA': { 
    name: 'Pennsylvania', 
    propertyRegime: 'equitable',
    equitableFactors: [
      'Length of the marriage',
      'Prior marriage of either party',
      'Age, health, station, amount and sources of income',
      'Vocational skills, employability, estate, liabilities and needs',
      'Contribution by one party to education, training or increased earning power',
      'Opportunity for future acquisitions of capital assets and income',
      'Sources of income including medical, retirement, insurance or other benefits',
      'Contribution or dissipation of assets',
      'Value of property set apart to each party',
      'Standard of living established during marriage',
      'Economic circumstances at time of divorce',
      'Tax ramifications',
      'Expense of sale'
    ]
  },
  'RI': { name: 'Rhode Island', propertyRegime: 'equitable' },
  'SC': { name: 'South Carolina', propertyRegime: 'equitable' },
  'SD': { name: 'South Dakota', propertyRegime: 'equitable' },
  'TN': { name: 'Tennessee', propertyRegime: 'equitable' },
  'TX': { 
    name: 'Texas', 
    propertyRegime: 'community',
    specialRules: [
      'Income from separate property is community property',
      'Inception of title rule for reimbursement claims'
    ]
  },
  'UT': { name: 'Utah', propertyRegime: 'equitable' },
  'VT': { name: 'Vermont', propertyRegime: 'equitable' },
  'VA': { name: 'Virginia', propertyRegime: 'equitable' },
  'WA': { 
    name: 'Washington', 
    propertyRegime: 'community',
    isQCPState: true, // <-- Add this line
    specialRules: ['Allows for unequal division based on economic misconduct']
  },
  'WV': { name: 'West Virginia', propertyRegime: 'equitable' },
  'WI': { 
    name: 'Wisconsin', 
    propertyRegime: 'community',
    specialRules: ['Marital Property Act with deferred community property system']
  },
  'WY': { name: 'Wyoming', propertyRegime: 'equitable' },
  'DC': { name: 'District of Columbia', propertyRegime: 'equitable' }
};

export function getStateInfo(state: USState) {
  return STATE_INFO[state];
}

export function isCommunityPropertyState(state: USState): boolean {
  return COMMUNITY_PROPERTY_STATES.includes(state);
}

export function getPropertyRegime(state: USState): PropertyRegime {
  return getStateInfo(state).propertyRegime;
}

export function getStateName(state: USState): string {
  return getStateInfo(state).name;
}

export function getStatesByRegime(regime: PropertyRegime): USState[] {
  return Object.entries(STATE_INFO)
    .filter(([_, info]) => info.propertyRegime === regime)
    .map(([state, _]) => state as USState);
}