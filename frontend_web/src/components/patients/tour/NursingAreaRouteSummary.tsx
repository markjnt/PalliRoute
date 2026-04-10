import React, { useMemo, useState } from 'react';
import { alpha } from '@mui/material/styles';
import { Box, Chip, Collapse, Paper, Typography } from '@mui/material';
import {
    Straighten as StraightenIcon,
    AccessTime as AccessTimeIcon,
    ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
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
    region: 'nord' | 'sued';
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
        region,
        totalKm,
        utilizationPct,
        tourCount: list.length,
    };
}

/** Gleiche Schwellen wie in TourStats für Auslastungsfarbe */
function utilizationColorKey(pct: number | undefined): string {
    if (pct === undefined) return 'text.secondary';
    if (pct > 100) return 'error.main';
    if (pct > 90) return 'warning.main';
    if (pct > 70) return 'success.light';
    return 'success.main';
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
    const [expanded, setExpanded] = useState(false);

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

    const areaChipSx = (row: AreaAgg) => ({
        height: '20px',
        fontSize: '0.7rem',
        bgcolor: row.region === 'nord' ? 'primary.main' : 'secondary.main',
        color: 'white',
        fontWeight: 'bold' as const,
    });

    const Cell = ({ row }: { row: AreaAgg }) => (
        <Paper
            elevation={0}
            sx={(theme) => {
                const main =
                    row.region === 'nord'
                        ? theme.palette.primary.main
                        : theme.palette.secondary.main;
                return {
                    flex: 1,
                    minWidth: 140,
                    p: 1.5,
                    bgcolor: alpha(main, theme.palette.mode === 'dark' ? 0.18 : 0.1),
                    border: 1,
                    borderColor: alpha(main, theme.palette.mode === 'dark' ? 0.45 : 0.35),
                    borderRadius: 2,
                };
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
                    <Typography
                        variant="body2"
                        fontWeight={row.utilizationPct !== undefined ? 700 : 600}
                        sx={{ color: utilizationColorKey(row.utilizationPct) }}
                    >
                        {formatPct(row.utilizationPct)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        Auslastung
                    </Typography>
                </Box>
            </Box>
        </Paper>
    );

    const CompactInlineSegment = ({ row }: { row: AreaAgg }) => {
        const hasTours = row.tourCount > 0;
        const uc = utilizationColorKey(row.utilizationPct);
        return (
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    flexShrink: 0,
                    minWidth: 0,
                }}
            >
                <Chip
                    label={row.region === 'nord' ? 'N' : 'S'}
                    size="small"
                    sx={{ ...areaChipSx(row), flexShrink: 0 }}
                />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.35, flexShrink: 0 }}>
                    <AccessTimeIcon fontSize="small" sx={{ color: 'primary.main' }} />
                    <Typography
                        variant="body2"
                        component="span"
                        sx={{
                            color:
                                hasTours && row.utilizationPct !== undefined ? uc : 'text.secondary',
                            fontWeight:
                                hasTours && row.utilizationPct !== undefined ? 'bold' : 'normal',
                        }}
                    >
                        {hasTours ? formatPct(row.utilizationPct) : '–'}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.35, minWidth: 0 }}>
                    <StraightenIcon fontSize="small" sx={{ color: 'primary.main', flexShrink: 0 }} />
                    <Typography variant="body2" color="text.secondary" noWrap component="span">
                        {hasTours ? formatKm(row.totalKm) : '–'}
                    </Typography>
                </Box>
            </Box>
        );
    };

    if (nord.tourCount === 0 && sued.tourCount === 0) {
        return null;
    }

    const showBothCollapsed = nord.tourCount > 0 && sued.tourCount > 0;

    return (
        <Box sx={{ mb: 2, mt: -1 }}>
            <Box
                role="button"
                tabIndex={0}
                onClick={() => setExpanded((v) => !v)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setExpanded((v) => !v);
                    }
                }}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    flexWrap: 'nowrap',
                    width: '100%',
                    cursor: 'pointer',
                    userSelect: 'none',
                    py: 0.25,
                    mb: expanded ? 1 : 0,
                }}
                aria-expanded={expanded}
            >
                <ExpandMoreIcon
                    fontSize="small"
                    sx={{
                        flexShrink: 0,
                        color: 'action.active',
                        transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                    }}
                />
                {!expanded && (
                    <Box
                        sx={{
                            flex: 1,
                            minWidth: 0,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            flexWrap: 'nowrap',
                            overflow: 'hidden',
                        }}
                    >
                        <CompactInlineSegment row={nord} />
                        {showBothCollapsed && (
                            <Typography variant="body2" color="text.disabled" sx={{ flexShrink: 0 }}>
                                ·
                            </Typography>
                        )}
                        <CompactInlineSegment row={sued} />
                    </Box>
                )}
                {expanded && (
                    <Typography variant="caption" color="text.secondary" sx={{ flex: 1, minWidth: 0 }}>
                        Nord/Süd · Pflegekraft
                    </Typography>
                )}
            </Box>
            <Collapse in={expanded} timeout="auto">
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                    <Cell row={nord} />
                    <Cell row={sued} />
                </Box>
            </Collapse>
        </Box>
    );
};
