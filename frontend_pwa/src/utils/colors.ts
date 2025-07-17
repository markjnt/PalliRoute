// Appointment type colors (in MUI style)
export const appointmentTypeColors: Record<string, string> = {
    'HB': '#2196F3', // Blue - Home visit (Hausbesuch)
    'TK': '#4CAF50', // Green - Phone call (Telefonkontakt)
    'NA': '#d32f2f', // Red - New admission (Neuaufnahme)
    'default': '#9E9E9E' // Grey - Default for unknown types
};

// Employee type colors (in MUI style)
export const employeeTypeColors: Record<string, string> = {
    'Arzt': '#FFC107', // Yellow - Doctor
    'Honorararzt': '#795548', // Brown - Freelance doctor
    'default': '#9c27b0' // Purple - PDL, Physiotherapie, Pflegekraft, etc.
};

// Define route line colors (25 distinct colors, avoiding marker colors)
export const routeLineColors: string[] = [
    '#FF1493', // Deep Pink
    '#00CED1', // Dark Turquoise
    '#FF8C00', // Dark Orange
    '#8A2BE2', // Blue Violet
    '#3CB371', // Medium Sea Green
    '#DB7093', // Pale Violet Red
    '#4169E1', // Royal Blue
    '#808000', // Olive
    '#FF4500', // Orange Red
    '#DA70D6', // Orchid
    '#6495ED', // Cornflower Blue
    '#CD853F', // Peru
    '#20B2AA', // Light Sea Green
    '#B8860B', // Dark Goldenrod
    '#5F9EA0', // Cadet Blue
    '#FF6347', // Tomato
    '#7B68EE', // Medium Slate Blue
    '#FA8072', // Salmon
    '#556B2F', // Dark Olive Green
    '#E9967A', // Dark Salmon
    '#483D8B', // Dark Slate Blue
    '#008080', // Teal
    '#BC8F8F', // Rosy Brown
    '#4682B4', // Steel Blue
    '#D2691E'  // Chocolate
];

// Helper function to get color for a tour number
export const getColorForTour = (tourNumber: number | undefined): string => {
    if (!tourNumber) return '#9E9E9E'; // Default grey for undefined tour
    
    // Ensure tourNumber is a positive number and convert to zero-based index
    const index = (Math.abs(tourNumber) - 1) % routeLineColors.length;
    return routeLineColors[index];
}; 