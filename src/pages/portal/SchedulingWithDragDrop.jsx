/**
 * Portal Integration Example - Using Drag-Drop Schedule
 * Shows how to integrate DragDropScheduleIntegration into portal pages
 */

import React, { useState } from 'react';
import DragDropScheduleIntegration from '../../components/DragDropScheduleIntegration';
import PortalHeader from '../../components/PortalHeader';

/**
 * Example: Scheduling Page with Drag-Drop
 * This page can replace or enhance your existing Scheduling.jsx
 */
const SchedulingWithDragDrop = () => {
  const [selectedSite, setSelectedSite] = useState(null);

  const handleScheduleChange = (updatedShifts) => {
    console.log('Schedule updated:', updatedShifts);
    // You can perform additional actions here
    // e.g., trigger notifications, update analytics, etc.
  };

  return (
    <div>
      <PortalHeader
        title="Schedule Management"
        subtitle="Create, move, and manage shifts with drag-and-drop"
        icon="calendar"
      />

      <div className="p-6">
        <DragDropScheduleIntegration
          onScheduleChange={handleScheduleChange}
          showMultiDay={true}
          defaultView="single"
          siteId={selectedSite}
        />
      </div>
    </div>
  );
};

export default SchedulingWithDragDrop;
