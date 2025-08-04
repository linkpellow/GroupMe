import React from 'react';
import DailyGoals from './DailyGoals';
import { useFollowUpUI } from '../context/FollowUpUIContext';

/**
 * RemindersStrip is a thin wrapper around the existing DailyGoals component that allows
 * us to treat DailyGoals as an in-flow horizontal strip on the Leads page and hide/show
 * it together with the Follow-Up strip via the shared FollowUpUIContext.
 */
const RemindersStrip: React.FC = () => {
  const { isVisible } = useFollowUpUI();

  // When hidden we simply remove the strip from the DOM to keep spacing tight.
  if (!isVisible) {
    return null;
  }

  // DailyGoals already provides its own header, styling and internal collapsed state.
  // We rely on those directly.
  return (
    <div style={{ width: '100%', marginBottom: '0', position: 'relative', zIndex: 100 }}>
      <DailyGoals />
    </div>
  );
};

export default RemindersStrip;
