import React from 'react';

/**
 * Standard short name mapping for premier Indian institutions.
 * Preserves recognized acronyms (e.g., 'IISc Bangalore', 'AIIMS Delhi', 'JNU', 'BHU').
 */
const PREMIER_NAME_MAP: Record<string, string> = {
  'Indian Institute of Science Bangalore': 'IISc Bangalore',
  'Indian Institute of Science, Bangalore': 'IISc Bangalore',
  'Indian Institute of Science': 'IISc Bangalore',
  'All India Institute of Medical Sciences, Delhi': 'AIIMS Delhi',
  'All India Institute of Medical Sciences Delhi': 'AIIMS Delhi',
  'All India Institute of Medical Sciences': 'AIIMS Delhi',
  'Jawaharlal Nehru University': 'JNU',
  'Banaras Hindu University': 'BHU',
  'Jamia Millia Islamia': 'JMI',
  'Aligarh Muslim University': 'AMU',
  'University of Delhi': 'DU',
  'University of Hyderabad': 'UoH',
  'Delhi Technological University': 'DTU',
  'Anna University': 'Anna Univ',
  'Vellore Institute of Technology': 'VIT Vellore',
  'Manipal Academy of Higher Education': 'MAHE Manipal',
  'Saveetha Institute of Medical and Technical Sciences': 'SIMATS Chennai',
  'Kalinga Institute of Industrial Technology': 'KIIT Bhubaneswar',
  "Siksha 'O' Anusandhan": 'SOA Bhubaneswar',
  'Post Graduate Institute of Medical Education and Research': 'PGIMER Chandigarh',
  'Savitribai Phule Pune University': 'SPPU Pune',
  'Jadavpur University': 'Jadavpur Univ',
  'Amrita Vishwa Vidyapeetham': 'Amrita Univ',
  'Calcutta University': 'Calcutta Univ',
  'Bharathiar University': 'Bharathiar Univ',
  'Osmania University': 'Osmania Univ',
  'Panjab University': 'Panjab Univ',
  'Thapar Institute of Engineering and Technology': 'TIET Patiala',
  'Birla Institute of Technology & Science - Pilani': 'BITS Pilani',
  'Birla Institute of Technology & Science': 'BITS Pilani',
  'Birla Institute of Technology and Science': 'BITS Pilani',
  'Indian Institute of Technology (BHU) Varanasi': 'IIT BHU',
  'Indian Institute of Technology (Indian School of Mines)': 'IIT (ISM) Dhanbad',
  'National Institute of Technology Karnataka, Surathkal': 'NIT Surathkal',
  'National Institute of Technology Tiruchirappalli': 'NIT Trichy',
};

/**
 * Returns a clean, readable short name for any institution.
 */
export function getShortInstitutionName(fullName: string): string {
  if (!fullName) return '';
  const trimmed = fullName.trim();

  if (PREMIER_NAME_MAP[trimmed]) {
    return PREMIER_NAME_MAP[trimmed];
  }

  // Regex abbreviations for known institution families
  let short = trimmed
    .replace(/^Indian Institute of Technology\s*,?\s*/i, 'IIT ')
    .replace(/^National Institute of Technology\s*,?\s*/i, 'NIT ')
    .replace(/^Indian Institute of Management\s*,?\s*/i, 'IIM ')
    .replace(/^Indian Institute of Information Technology\s*,?\s*/i, 'IIIT ')
    .replace(/^Indian Institute of Science Education and Research\s*,?\s*/i, 'IISER ')
    .replace(/^All India Institute of Medical Sciences\s*,?\s*/i, 'AIIMS ')
    .replace(/^National Institute of Pharmaceutical Education and Research\s*,?\s*/i, 'NIPER ')
    .replace(/\s*\(Deemed to be University\)/i, '')
    .replace(/\s*,?\s*Deemed to be University/i, '')
    .replace(/\s*,?\s*Deemed University/i, '');

  return short.trim();
}

/**
 * Truncates text if it exceeds maxChars with ellipsis.
 */
export function truncateLabel(text: string, maxChars: number = 20): string {
  if (!text) return '';
  return text.length > maxChars ? `${text.slice(0, maxChars - 1)}…` : text;
}

export interface TruncatedYAxisTickProps {
  x?: number;
  y?: number;
  payload?: { value: string | number };
  maxChars?: number;
  fill?: string;
  fontSize?: number;
  fontWeight?: number | string;
  fullNameMap?: Record<string, string> | Map<string, string>;
}

/**
 * SVG Y-Axis Tick Component for Recharts.
 * - Truncates label cleanly if over maxChars
 * - Injects SVG <title> tooltip containing the full institution/entity name on hover
 */
export const TruncatedYAxisTick: React.FC<TruncatedYAxisTickProps> = ({
  x = 0,
  y = 0,
  payload,
  maxChars = 20,
  fill = '#475569',
  fontSize = 11,
  fontWeight = 500,
  fullNameMap,
}) => {
  const rawValue = String(payload?.value ?? '');
  const fullName =
    (fullNameMap && (fullNameMap instanceof Map ? fullNameMap.get(rawValue) : fullNameMap[rawValue])) ||
    rawValue;

  const shortName = getShortInstitutionName(rawValue);
  const displayText = truncateLabel(shortName, maxChars);

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={-8}
        y={4}
        textAnchor="end"
        fill={fill}
        fontSize={fontSize}
        fontWeight={fontWeight}
        className="cursor-default select-none hover:opacity-80 transition-opacity"
      >
        <title>{fullName}</title>
        {displayText}
      </text>
    </g>
  );
};

