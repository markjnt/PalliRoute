import React, { useMemo } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { Straighten as StraightenIcon, AccessTime as AccessTimeIcon } from '@mui/icons-material';
import { Employee, Route, Weekday } from '../../../types/models';

/** Nur Hausbesuchs-Pflegekräfte; keine PDL, Physiotherapie, Ärzte, … */
function isPflegekraftTour(emp: Employee): boolean {
    return emp.function === 'Pflegekraft';
}

/** Nord/Süd nur für eindeutige Kreise; „Nord- und Südkreis“ und Unbekannt → kein Bucket. */
function employeeAreaRegion(area: string | undefined): 'nord' | 'sued' | null {
    if (!area) return null;
    if (area === 'Nord- und Südkreis') return null;
    if (area === 'Nordkreis' || area === 'Nord') return 'nord';
    if (area === 'Südkreis' || area === 'Süd') return 'sued';
    if (area.includes('Nordkreis')) return 'nord';
    if (area.includes('Südkreis')) return 'sued';
    return null;
}

function targetMinutes(emp: Employee): number {
    return Math.round(420 * ((emp.work_hours || 0) / 100));
}

function routeForEmployee(
    routes: Route[],
    employeeId: number | undefined,
    weekday: Weekday
): Route | undefined {
    if (employeeId === undefined) return undefined;
    return routes.find(
        (r) => r.employee_id === employeeId && r.weekday === weekday.toLowerCase()
    );
}

interface AreaAgg {
    label: string;
    totalKm: number;
    utilizationPct: number | undefined;
    tourCount: number;
}

function aggregateForArea(
    employees: Employee[],
    routes: Route[],
    weekday: Weekday,
    region: 'nord' | 'sued'
): AreaAgg {
    const list = employees.filter((e) => {
        if (e.id == null || !isPflegekraftTour(e)) return false;
        return employeeAreaRegion(e.area) === region;
    });
    let sumDuration = 0;
    let sumTarget = 0;
    let totalKm = 0;

    for (const emp of list) {
        const r = routeForEmployee(routes, emp.id, weekday);
        sumTarget += targetMinutes(emp);
        if (r && typeof r.total_duration === 'number') {
            sumDuration += r.total_duration;
        }
        if (r && typeof r.total_distance === 'number') {
            totalKm += r.total_distance;
        }
    }

    const utilizationPct =
        sumTarget > 0 ? (sumDuration / sumTarget) * 100 : undefined;

    return {
        label: region === 'nord' ? 'Nord' : 'Süd',
        totalKm,
        utilizationPct,
        tourCount: list.length,
    };
}

interface NursingAreaRouteSummaryProps {
    employees: Employee[];
    routes: Route[];
    selectedDay: Weekday;
}

export const NursingAreaRouteSummary: React.FC<NursingAreaRouteSummaryProps> = ({
    employees,
    routes,
    selectedDay,
}) => {
    const { nord, sued } = useMemo(() => {
        const nord = aggregateForArea(employees, routes, selectedDay, 'nord');
        const sued = aggregateForArea(employees, routes, selectedDay, 'sued');
        return { nord, sued };
    }, [employees, routes, selectedDay]);

    const formatKm = (km: number) =>
        km.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) +
        ' km';

    const formatPct = (p: number | undefined) =>
        p !== undefined ? `${Math.round(p)}%` : '–';

    const Cell = ({ row }: { row: AreaAgg }) => (
        <Paper
            elevation={0}
            sx={{
                flex: 1,
                minWidth: 140,
                p: 1.5,
                bgcolor: 'action.hover',
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
            }}
        >
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                {row.label}kreis · Pflegekraft
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <StraightenIcon fontSize="small" color="primary" />
                    <Typography variant="body2" fontWeight={600}>
                        {formatKm(row.totalKm)}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <AccessTimeIcon fontSize="small" color="primary" />
                    <Typography variant="body2" fontWeight={600}>
                        {formatPct(row.utilizationPct)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        Auslastung
                    </Typography>
                </Box>
            </Box>
        </Paper>
    );

    if (nord.tourCount === 0 && sued.tourCount === 0) {
        return null;
    }

    return (
        <Box sx={{ mb: 2, mt: -1 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                <Cell row={nord} />
                <Cell row={sued} />
            </Box>
        </Box>
    );
};
