import React from 'react';
import { SaveStatus } from './WritingWorkspace';

const CheckCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
);

const ExclamationCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
);

const PencilIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
    </svg>
);

interface StatusIndicatorProps {
    status: SaveStatus;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status }) => {
    const statusConfig = {
        saved: {
            text: 'Saved',
            icon: <CheckCircleIcon className="h-4 w-4" />,
            color: 'text-green-400',
        },
        saving: {
            text: 'Saving...',
            icon: <div className="h-3 w-3 border-2 border-t-transparent border-cyan-400 rounded-full animate-spin"></div>,
            color: 'text-cyan-400',
        },
        unsaved: {
            text: 'Unsaved changes',
            icon: <PencilIcon className="h-4 w-4" />,
            color: 'text-yellow-400',
        },
        error: {
            text: 'Save failed',
            icon: <ExclamationCircleIcon className="h-4 w-4" />,
            color: 'text-red-400',
        },
    };

    const currentStatus = statusConfig[status];

    return (
        <div className={`flex items-center gap-2 text-xs font-medium p-1 rounded-md ${currentStatus.color}`}>
            {currentStatus.icon}
            <span>{currentStatus.text}</span>
        </div>
    );
};

export default StatusIndicator;
