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

// Define vibrant route line colors (avoiding colors used elsewhere in the app)
export const routeLineColors: string[] = [
    '#FF1493', // Deep Pink
    '#00CED1', // Dark Turquoise
    '#FF8C00', // Dark Orange
    '#8A2BE2', // Blue Violet
    '#00B894', // Mint Teal
    '#E84393', // Vivid Pink
    '#1E90FF', // Dodger Blue
    '#6C5CE7', // Electric Indigo
    '#FF4500', // Orange Red
    '#9B59B6', // Strong Purple
    '#16A085', // Green Teal
    '#C0392B', // Brick Red
    '#2980B9', // Deep Blue
    '#27AE60', // Emerald
    '#D35400', // Pumpkin
    '#2C3E50', // Midnight Blue
    '#E74C3C', // Alizarin
    '#F39C12', // Orange Amber
    '#7D3C98', // Dark Violet
    '#0E7490', // Cyan Blue
    '#BE123C', // Ruby
    '#4338CA', // Indigo
    '#0F766E', // Sea Green
    '#EA580C', // Bright Orange
    '#0891B2', // Sky Cyan
    '#65A30D', // Olive Green
    '#7C2D12', // Rust Brown
    '#A21CAF', // Magenta Purple
    '#DB2777', // Rose
    '#0369A1', // Ocean Blue
    '#B45309', // Burnt Orange
    '#4D7C0F', // Moss Green
    '#9D174D', // Dark Pink
    '#1D4ED8', // Royal Indigo
    '#047857', // Emerald Teal
    '#DC2626', // Strong Red
    '#C2185B', // Raspberry
    '#00897B', // Teal Green
    '#5E35B1', // Royal Purple
    '#F4511E', // Blaze Orange
    '#3949AB', // Cobalt Indigo
    '#00838F', // Deep Cyan
    '#6D4C41', // Cocoa Brown
    '#D81B60', // Pink Crimson
    '#039BE5', // Bright Azure
    '#558B2F', // Forest Olive
    '#8E24AA', // Amethyst
    '#EF6C00', // Tangerine
    '#00695C', // Pine Teal
    '#AD1457'  // Dark Fuchsia
];

// Helper function to get color for an employee ID
export const getColorForTour = (employeeId: number | undefined): string => {
    if (!employeeId) return '#9E9E9E'; // Default grey for undefined employee
    
    // Ensure employeeId is a positive number and convert to zero-based index
    const index = (Math.abs(employeeId) - 1) % routeLineColors.length;
    return routeLineColors[index];
}; 