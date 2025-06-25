export interface CalendlyEventType {
  id: string;
  name: string;
  url: string;
  description: string;
}

export const CALENDLY_EVENT_TYPES: CalendlyEventType[] = [
  {
    id: 'discoverycall',
    name: 'Discovery Call',
    url: 'linkpellowinsurance/discoverycall',
    description: 'Initial consultation to discuss insurance needs',
  },
  {
    id: 'options-review',
    name: 'Options Review & Plan Setup',
    url: 'linkpellowinsurance/options-review-and-plan-set-up-clone',
    description: 'Review available options and set up your plan',
  },
  {
    id: 'application',
    name: 'Application For Approval',
    url: 'linkpellowinsurance/application-for-approval',
    description: 'Complete application for insurance approval',
  },
  {
    id: 'referrals',
    name: 'Referrals',
    url: 'linkpellowinsurance/referrals',
    description: 'Schedule a referral meeting',
  },
];
