import { Sheet, SheetRef } from 'react-modal-sheet';
import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { RouteInfo } from '../route/RouteInfo';
import { RouteList } from '../route/RouteList';
import { AdditionalRoutesSelector } from '../route/AdditionalRoutesSelector';
import { useAdditionalRoutesStore } from '../../stores/useAdditionalRoutesStore';
import { useUserStore } from '../../stores/useUserStore';
import { useDragStore } from '../../stores/useDragStore';

interface MainBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface MainBottomSheetRef {
  // No methods needed for simple open/close behavior
}

export const MainBottomSheet = forwardRef<MainBottomSheetRef, MainBottomSheetProps>(
  ({ isOpen, onClose }, ref) => {
    const sheetRef = useRef<SheetRef>(null);
    const [currentSnap, setCurrentSnap] = useState(1);
  const { selectedEmployeeIds, toggleEmployee, selectAll, deselectAll, resetForNewUser } = useAdditionalRoutesStore();
  const { selectedUserId, selectedWeekendArea } = useUserStore();
    const { isDragging } = useDragStore();

    const snapPoints = [0.88, 0];

    // Reset additional routes when logged-in user or weekend area changes
    useEffect(() => {
      resetForNewUser();
    }, [selectedUserId, selectedWeekendArea, resetForNewUser]);

    const handleSnapChange = (snapIndex: number) => {
      setCurrentSnap(snapIndex);
    };

    // No imperative methods needed for simple open/close behavior
    useImperativeHandle(ref, () => ({}), []);

    return (
      <>
        <Sheet
          ref={sheetRef}
          isOpen={isOpen}
          onClose={onClose}
          initialSnap={0}
          snapPoints={snapPoints}
          onSnap={handleSnapChange}
          disableDrag={isDragging}
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
            <Sheet.Content style={{ paddingBottom: sheetRef.current?.y }}>
              <Sheet.Scroller draggableAt="top">
                <RouteInfo />
                <RouteList />
                <AdditionalRoutesSelector 
                  selectedEmployeeIds={selectedEmployeeIds}
                  onEmployeeToggle={toggleEmployee}
                  onSelectAll={selectAll}
                  onDeselectAll={deselectAll}
                />
              </Sheet.Scroller>
            </Sheet.Content>
          </Sheet.Container>
        </Sheet>
      </>
    );
  }
);