import React, { createContext, useState, useContext, ReactNode } from 'react';

// Typ für gültige Wochentage
export type Weekday = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';

// Interface für den Context
interface WeekdayContextType {
  selectedWeekday: Weekday;
  setSelectedWeekday: (day: Weekday) => void;
}

// Create the context with a default value
const WeekdayContext = createContext<WeekdayContextType>({
  selectedWeekday: 'monday',
  setSelectedWeekday: () => {},
});

// Custom hook für einfachen Zugriff auf den Context
export const useWeekday = () => useContext(WeekdayContext);

// Provider-Komponente
interface WeekdayProviderProps {
  children: ReactNode;
}

export const WeekdayProvider: React.FC<WeekdayProviderProps> = ({ children }) => {
  // Standard-Wochentag ist Montag
  const [selectedWeekday, setSelectedWeekday] = useState<Weekday>('monday');

  // Wert für den Context
  const value = {
    selectedWeekday,
    setSelectedWeekday,
  };

  return (
    <WeekdayContext.Provider value={value}>
      {children}
    </WeekdayContext.Provider>
  );
}; 