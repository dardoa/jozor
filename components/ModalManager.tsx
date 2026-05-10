import { Suspense } from 'react';
import { useAppStore } from '../store/useAppStore';
import { LoadingSpinner } from './LoadingSpinner';
import { ActiveModalRenderer } from './modalManager/ActiveModalRenderer';
import { StateModalRenderer } from './modalManager/StateModalRenderer';
import type { ModalManagerProps } from './modalManager/modalManagerTypes';

export const ModalManager = (props: ModalManagerProps) => {
  const locations = useAppStore((state) => state.locations);

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <StateModalRenderer {...props} />
      <ActiveModalRenderer modal={props} locations={locations} />
    </Suspense>
  );
};
