import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

interface DropdownProps {
    trigger: React.ReactElement;
    children: (close: () => void) => React.ReactNode;
    menuClasses?: string;
}

const Dropdown: React.FC<DropdownProps> = ({ trigger, children, menuClasses = 'w-56' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const triggerRef = useRef<HTMLElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [positionStyles, setPositionStyles] = useState<React.CSSProperties>({});
    const [transformOriginClass, setTransformOriginClass] = useState('origin-top-left');

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setIsOpen(prev => !prev);
    
        // Preserve original onClick if it exists on the trigger
        if (trigger.props && typeof (trigger.props as any).onClick === 'function') {
            (trigger.props as any).onClick(e);
        }
    };

    const handleClose = () => setIsOpen(false);

    // Use useLayoutEffect to prevent flicker by calculating position before the browser paints
    useLayoutEffect(() => {
        if (isOpen && triggerRef.current && dropdownRef.current) {
            const triggerRect = triggerRef.current.getBoundingClientRect();
            const dropdownRect = dropdownRef.current.getBoundingClientRect();

            const styles: React.CSSProperties = {};
            let originClassParts: string[] = [];
            
            // Vertical positioning
            const spaceBelow = window.innerHeight - triggerRect.bottom;
            const spaceAbove = triggerRect.top;

            if (spaceBelow < dropdownRect.height && spaceAbove > dropdownRect.height) {
                // Not enough space below, but enough above -> position above
                styles.bottom = window.innerHeight - triggerRect.top + 4;
                originClassParts.push('origin-bottom');
            } else {
                // Default to position below
                styles.top = triggerRect.bottom + 4;
                originClassParts.push('origin-top');
            }

            // Horizontal positioning
            if (triggerRect.left + dropdownRect.width > window.innerWidth && triggerRect.right > dropdownRect.width) {
                 // Overflows right, but has space to be right-aligned -> align right
                 styles.right = window.innerWidth - triggerRect.right;
                 originClassParts.push('right');
            } else {
                // Default to align left
                styles.left = triggerRect.left;
                originClassParts.push('left');
            }

            setPositionStyles(styles);
            setTransformOriginClass(originClassParts.join('-'));
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
                triggerRef.current && !triggerRef.current.contains(event.target as Node)
            ) {
                handleClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const clonedTrigger = React.cloneElement(trigger as React.ReactElement<any>, {
        ref: triggerRef,
        onClick: handleToggle,
        'aria-haspopup': 'true',
        'aria-expanded': isOpen,
    });
    
    return (
        <>
            {clonedTrigger}
            {isOpen && createPortal(
                <div
                    ref={dropdownRef}
                    style={positionStyles}
                    className={`fixed rounded-md shadow-lg bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none z-50 transition ease-out duration-100 transform opacity-100 scale-100 ${transformOriginClass} ${menuClasses}`}
                    role="menu"
                    aria-orientation="vertical"
                >
                    {children(handleClose)}
                </div>,
                document.body
            )}
        </>
    );
};

export default Dropdown;
