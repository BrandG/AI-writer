import React from 'react';

const Logo: React.FC<{ className?: string; showText?: boolean }> = ({ className, showText = true }) => (
    <div className={`flex items-center gap-3 ${className}`}>
        <div className="h-10 w-10 bg-gray-800 p-2 rounded-lg border border-gray-700 flex-shrink-0">
            <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-cyan-400"
            >
                {/* Pen nib shape as the A */}
                <path
                    d="M12 2L4 13.9375V22H20V13.9375L12 2Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                {/* Slit in the nib */}
                <path d="M12 14V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                {/* The crossbar of the A */}
                <path d="M8 15H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
        </div>
        {showText && <span className="text-xl font-bold text-white tracking-tight hidden sm:inline">StoryLoom</span>}
    </div>
);

export default Logo;