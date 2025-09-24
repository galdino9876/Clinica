import React from 'react';

interface AppointmentProgressAlertProps {
  isVisible: boolean;
  message: string;
}

const AppointmentProgressAlert: React.FC<AppointmentProgressAlertProps> = ({
  isVisible,
  message
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 bg-blue-100 border border-blue-300 rounded-lg p-4 shadow-lg">
      <div className="flex items-center gap-3">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
        <span className="text-blue-800 font-medium">{message}</span>
      </div>
    </div>
  );
};

export default AppointmentProgressAlert;
