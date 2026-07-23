import { PositionType } from '@prisma/client';

export const SHARED_TYPES = ['GROOMING', 'SURGERY', 'EMERGENCY', 'CONFINEMENT'] as const;

export interface DistConfigItem {
  rate: number;
  label: string;
  eligiblePositions: PositionType[];
  divisionPositions?: PositionType[];
  incentiveType: string;
  sourceType?: string;
}

export const DISTRIBUTION_CONFIG: Record<string, DistConfigItem> = {
  GROOMING: {
    rate: 75, label: 'Grooming',
    eligiblePositions: [PositionType.GROOMER, PositionType.GROOMER_VET_ASSISTANT],
    incentiveType: 'GROOMING',
  },
  SURGERY: {
    rate: 100, label: 'Surgery',
    eligiblePositions: [
      PositionType.VETERINARY_ASSISTANT, PositionType.VETERINARY_NURSE,
      PositionType.CLINIC_SECRETARY, PositionType.STAFF, PositionType.GROOMER_VET_ASSISTANT,
    ],
    incentiveType: 'SURGERY',
  },
  EMERGENCY: {
    rate: 120, label: 'Emergency',
    eligiblePositions: [
      PositionType.VETERINARY_ASSISTANT, PositionType.VETERINARY_NURSE,
      PositionType.CLINIC_SECRETARY, PositionType.STAFF, PositionType.GROOMER_VET_ASSISTANT,
    ],
    incentiveType: 'EMERGENCY',
  },
  CONFINEMENT_VET: {
    rate: 55, label: 'Confinement (Vet)',
    eligiblePositions: [PositionType.RESIDENT_VETERINARIAN],
    divisionPositions: [PositionType.RESIDENT_VETERINARIAN, PositionType.JUNIOR_VETERINARIAN],
    incentiveType: 'CONFINEMENT_VET', sourceType: 'CONFINEMENT',
  },
  CONFINEMENT_STAFF: {
    rate: 45, label: 'Confinement (Staff)',
    eligiblePositions: [
      PositionType.VETERINARY_ASSISTANT, PositionType.VETERINARY_NURSE,
      PositionType.CLINIC_SECRETARY, PositionType.STAFF, PositionType.GROOMER_VET_ASSISTANT,
    ],
    incentiveType: 'CONFINEMENT_ASST', sourceType: 'CONFINEMENT',
  },
};
