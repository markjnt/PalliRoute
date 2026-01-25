import { DutyType, OnCallArea, ShiftDefinition, ShiftCategory, ShiftRole, ShiftTimeOfDay, ShiftArea } from '../../types/models';

/**
 * Maps a DutyType + OnCallArea combination to ShiftDefinition parameters
 */
export function dutyTypeToShiftDefinition(
    dutyType: DutyType,
    area: OnCallArea
): {
    category: ShiftCategory;
    role: ShiftRole;
    area: ShiftArea;
    time_of_day: ShiftTimeOfDay;
} {
    const mapping: Record<DutyType, (area: OnCallArea) => { category: ShiftCategory; role: ShiftRole; area: ShiftArea; time_of_day: ShiftTimeOfDay }> = {
        'rb_nursing_weekday': (area) => ({
            category: 'RB_WEEKDAY',
            role: 'NURSING',
            area: area === 'Nord' ? 'Nord' : area === 'Süd' ? 'Süd' : 'Mitte',
            time_of_day: 'NONE'
        }),
        'rb_nursing_weekend_day': (area) => ({
            category: 'RB_WEEKEND',
            role: 'NURSING',
            area: area === 'Nord' ? 'Nord' : area === 'Süd' ? 'Süd' : 'Mitte',
            time_of_day: 'DAY'
        }),
        'rb_nursing_weekend_night': (area) => ({
            category: 'RB_WEEKEND',
            role: 'NURSING',
            area: area === 'Nord' ? 'Nord' : area === 'Süd' ? 'Süd' : 'Mitte',
            time_of_day: 'NIGHT'
        }),
        'rb_doctors_weekday': (area) => ({
            category: 'RB_WEEKDAY',
            role: 'DOCTOR',
            area: area === 'Nord' ? 'Nord' : area === 'Süd' ? 'Süd' : 'Mitte',
            time_of_day: 'NONE'
        }),
        'rb_doctors_weekend': (area) => ({
            category: 'RB_WEEKEND',
            role: 'DOCTOR',
            area: area === 'Nord' ? 'Nord' : area === 'Süd' ? 'Süd' : 'Mitte',
            time_of_day: 'NONE'
        }),
        'aw_nursing': (area) => ({
            category: 'AW',
            role: 'NURSING',
            area: area === 'Nord' ? 'Nord' : area === 'Süd' ? 'Süd' : 'Mitte',
            time_of_day: 'NONE'
        })
    };

    return mapping[dutyType](area);
}

/**
 * Maps a ShiftDefinition to DutyType + OnCallArea
 * Returns null if the shift definition doesn't map to a known DutyType
 */
export function shiftDefinitionToDutyType(
    shiftDef: ShiftDefinition
): { dutyType: DutyType; area: OnCallArea } | null {
    const { category, role, area, time_of_day } = shiftDef;

    // Map area from ShiftArea to OnCallArea
    const onCallArea: OnCallArea = area === 'Nord' ? 'Nord' : area === 'Süd' ? 'Süd' : 'Mitte';

    if (category === 'RB_WEEKDAY') {
        if (role === 'NURSING') {
            return { dutyType: 'rb_nursing_weekday', area: onCallArea };
        } else if (role === 'DOCTOR') {
            return { dutyType: 'rb_doctors_weekday', area: onCallArea };
        }
    } else if (category === 'RB_WEEKEND') {
        if (role === 'NURSING') {
            if (time_of_day === 'DAY') {
                return { dutyType: 'rb_nursing_weekend_day', area: onCallArea };
            } else if (time_of_day === 'NIGHT') {
                return { dutyType: 'rb_nursing_weekend_night', area: onCallArea };
            }
        } else if (role === 'DOCTOR') {
            return { dutyType: 'rb_doctors_weekend', area: onCallArea };
        }
    } else if (category === 'AW' && role === 'NURSING') {
        return { dutyType: 'aw_nursing', area: onCallArea };
    }

    return null;
}

/**
 * Finds a matching ShiftDefinition from a list based on DutyType + OnCallArea
 */
export function findShiftDefinition(
    shiftDefinitions: ShiftDefinition[],
    dutyType: DutyType,
    area: OnCallArea
): ShiftDefinition | undefined {
    const params = dutyTypeToShiftDefinition(dutyType, area);
    return shiftDefinitions.find(
        (sd) =>
            sd.category === params.category &&
            sd.role === params.role &&
            sd.area === params.area &&
            sd.time_of_day === params.time_of_day
    );
}
