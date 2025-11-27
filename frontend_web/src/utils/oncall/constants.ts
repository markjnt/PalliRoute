import { DutyType, OnCallArea } from '../../types/models';

export const WEEKDAY_DUTIES: Array<{ type: DutyType; label: string; area: OnCallArea; shortLabel: string }> = [
  { type: 'rb_nursing_weekday', label: 'RB Nord Pflege', area: 'Nord', shortLabel: 'RB Nord Pflege' },
  { type: 'rb_nursing_weekday', label: 'RB Süd Pflege', area: 'Süd', shortLabel: 'RB Süd Pflege' },
  { type: 'rb_doctors_weekday', label: 'RB Nord Ärzte', area: 'Nord', shortLabel: 'RB Nord Ärzte' },
  { type: 'rb_doctors_weekday', label: 'RB Süd Ärzte', area: 'Süd', shortLabel: 'RB Süd Ärzte' },
];

export const WEEKEND_DUTIES: Array<{ type: DutyType; label: string; area?: OnCallArea; shortLabel: string }> = [
  { type: 'aw_nursing', label: 'AW Nord', area: 'Nord', shortLabel: 'AW Nord' },
  { type: 'aw_nursing', label: 'AW Mitte', area: 'Mitte', shortLabel: 'AW Mitte' },
  { type: 'aw_nursing', label: 'AW Süd', area: 'Süd', shortLabel: 'AW Süd' },
  { type: 'rb_nursing_weekend_day', label: 'RB Nord Tag Pflege', area: 'Nord', shortLabel: 'RB Nord Tag Pflege' },
  { type: 'rb_nursing_weekend_night', label: 'RB Nord Nacht Pflege', area: 'Nord', shortLabel: 'RB Nord Nacht Pflege' },
  { type: 'rb_nursing_weekend_day', label: 'RB Süd Tag Pflege', area: 'Süd', shortLabel: 'RB Süd Tag Pflege' },
  { type: 'rb_nursing_weekend_night', label: 'RB Süd Nacht Pflege', area: 'Süd', shortLabel: 'RB Süd Nacht Pflege' },
  { type: 'rb_doctors_weekend', label: 'RB Nord Ärzte', area: 'Nord', shortLabel: 'RB Nord Ärzte' },
  { type: 'rb_doctors_weekend', label: 'RB Süd Ärzte', area: 'Süd', shortLabel: 'RB Süd Ärzte' },
];

export const WEEK_DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

