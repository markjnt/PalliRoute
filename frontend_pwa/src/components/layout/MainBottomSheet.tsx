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
  expandToFull: () => void;
  cycleSheetState: () => void;
}

export const MainBottomSheet = forwardRef<MainBottomSheetRef, MainBottomSheetProps>(
  ({ isOpen, onClose }, ref) => {
    const sheetRef = useRef<SheetRef>(null);
    const [currentSnap, setCurrentSnap] = useState(1);
    const { selectedEmployeeIds, toggleEmployee, selectAll, deselectAll, resetForNewUser } = useAdditionalRoutesStore();
    const { selectedUserId } = useUserStore();
    const { isDragging } = useDragStore();

    const snapPoints = [0.95, 0.35, 0];

    // Reset additional routes when logged-in user changes
    useEffect(() => {
      resetForNewUser();
    }, [selectedUserId, resetForNewUser]);

    const handleSnapChange = (snapIndex: number) => {
      setCurrentSnap(snapIndex);
    };

    const expandToFull = () => {
      if (sheetRef.current && currentSnap === 1) {
        sheetRef.current.snapTo(0); // Snap to full height (0.95)
      }
    };

    const cycleSheetState = () => {
      if (!sheetRef.current) return;
      
      if (currentSnap === 1) {
        // Currently at middle snap (32%), expand to full (95%)
        sheetRef.current.snapTo(0);
      } else if (currentSnap === 0) {
        // Currently at full snap (95%), close the sheet
        onClose();
      }
    };

    // Expose functions to parent
    useImperativeHandle(ref, () => ({
      expandToFull,
      cycleSheetState
    }), [currentSnap, onClose]);

    return (
      <>
        <Sheet
          ref={sheetRef}
          isOpen={isOpen}
          onClose={onClose}
          initialSnap={1}
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