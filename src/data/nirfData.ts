/**
 * Real National Institutional Ranking Framework (NIRF) Dataset (2017–2025)
 * Processed and structured from official Ministry of Education / NIRF CSVs.
 */

import nirfDataset from './nirfData.json';
import { Institution, RankingRecord, CategoryType } from '../types';

export const INSTITUTIONS: Institution[] = nirfDataset.institutions as Institution[];

export const RANKINGS: RankingRecord[] = nirfDataset.rankings as RankingRecord[];

export const YEARS: number[] = nirfDataset.years;

export const CATEGORIES: { label: string; value: string; description: string }[] = nirfDataset.categories;

export const STATES: string[] = nirfDataset.states;

export const PARAMETERS_INFO = [
  {
    key: 'TLR',
    name: 'Teaching, Learning & Resources',
    weight: 30,
    description: 'Core faculty, faculty-student ratio, facilities, and financial resource utilization.',
    color: '#2459D3',
  },
  {
    key: 'RPC',
    name: 'Research and Professional Practice',
    weight: 30,
    description: 'Publications, citations, patents, quality of research, and funded research projects.',
    color: '#8B5CF6',
  },
  {
    key: 'GO',
    name: 'Graduation Outcomes',
    weight: 20,
    description: 'Student placement rates, median salary, and progression to higher studies.',
    color: '#10B981',
  },
  {
    key: 'OI',
    name: 'Outreach and Inclusivity',
    weight: 10,
    description: 'Regional diversity, women student ratio, economically/socially disadvantaged students, and facilities for physically challenged students.',
    color: '#F59E0B',
  },
  {
    key: 'PR',
    name: 'Perception',
    weight: 10,
    description: 'Peer perception and employer reputation survey scores.',
    color: '#EC4899',
  },
];

export const PARAMETER_WEIGHTS: Record<string, number> = {
  TLR: 0.3,
  RPC: 0.3,
  GO: 0.2,
  OI: 0.1,
  PR: 0.1,
};
