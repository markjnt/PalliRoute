import { Sheet, SheetRef } from 'react-modal-sheet';
import { useState, useRef, useEffect } from 'react';
import { WeekdayCalendar } from '../route/WeekdayCalendar';
import { RouteInfo } from '../route/RouteInfo';
import { RouteList } from '../route/RouteList';
import { AdditionalRoutesSelector } from '../route/AdditionalRoutesSelector';
import { useAdditionalRoutesStore } from '../../stores/useAdditionalRoutesStore';
import { useUserStore } from '../../stores/useUserStore';

interface MainBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MainBottomSheet({ isOpen, onClose }: MainBottomSheetProps) {
  const ref = useRef<SheetRef>(null);
  const { selectedEmployeeIds, toggleEmployee, resetForNewUser } = useAdditionalRoutesStore();
  const { selectedUserId } = useUserStore();

  const snapPoints = [0.95, 0.32, 0];

  // Reset additional routes when logged-in user changes
  useEffect(() => {
    resetForNewUser();
  }, [selectedUserId, resetForNewUser]);

  return (
    <>
      <Sheet
        isOpen={isOpen}
        onClose={onClose}
        initialSnap={1}
        snapPoints={snapPoints}
      >
        <Sheet.Container>
          <Sheet.Header>
            {/* Drag handle */}
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '8px 0',
                cursor: 'grab',
                }}>
                <div style={{
                    width: '60px',
                    height: '4px',
                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                    borderRadius: '8px',
                }} />
                </div>
          </Sheet.Header>
          <Sheet.Content style={{ paddingBottom: ref.current?.y }}>
            <RouteInfo />
            <Sheet.Scroller draggableAt="top">
                <WeekdayCalendar />
                <RouteList />
                <AdditionalRoutesSelector 
                  selectedEmployeeIds={selectedEmployeeIds}
                  onEmployeeToggle={toggleEmployee}
                />
            </Sheet.Scroller>
          </Sheet.Content>
        </Sheet.Container>
      </Sheet>
    </>
  );
}