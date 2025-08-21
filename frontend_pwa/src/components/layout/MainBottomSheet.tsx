import { Sheet, SheetRef } from 'react-modal-sheet';
import { useState, useRef, useEffect } from 'react';
import { WeekdayCalendar } from '../route/WeekdayCalendar';
import { RouteInfo } from '../route/RouteInfo';
import { RouteList } from '../route/RouteList';

interface MainBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MainBottomSheet({ isOpen, onClose }: MainBottomSheetProps) {
  const ref = useRef<SheetRef>(null);

  const snapPoints = [0.95, 0.32, 0];

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
            </Sheet.Scroller>
          </Sheet.Content>
        </Sheet.Container>
      </Sheet>
    </>
  );
}