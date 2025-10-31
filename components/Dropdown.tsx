import React, { useState, useRef, useEffect } from 'react';
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
    const [position, setPosition] = useState<{ top: number; left: number; right?: number }>({ top: 0, left: 0 });

    const handleToggle = () => {
        if (!isOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const spaceRight = window.innerWidth - rect.right;
            const menuWidth = parseInt(menuClasses.split(' ').find(c => c.startsWith('w-'))?.split('-')[1] || '224', 10);
            
            const pos: { top: number; left?: number; right?: number } = {
                top: rect.bottom + window.scrollY + 4
            };

            if (spaceRight < menuWidth) {
                pos.right = window.innerWidth - rect.right - window.scrollX;
            } else {
                pos.left = rect.left + window.scrollX;
            }

            setPosition(pos as { top: number; left: number; right?: number });
        }
        setIsOpen(prev => !prev);
    };

    const handleClose = () => setIsOpen(false);

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

    // FIX: Cast `trigger` to `React.ReactElement<any>` to resolve TypeScript errors with `ref` and `onClick`.
    // This is a safe cast because we know the trigger elements are DOM nodes which accept refs,
    // and it correctly informs TypeScript that `onClick` might exist on the props.
    const clonedTrigger = React.cloneElement(trigger as React.ReactElement<any>, {
        ref: triggerRef,
        onClick: (e: React.MouseEvent) => {
            e.stopPropagation();
            e.preventDefault();
            handleToggle();
            // FIX: The original trigger element might have its own onClick handler. To preserve it,
            // we must check for it and call it. The `trigger.props` type is too restrictive to
            // directly access `onClick`, so we cast it to `any` to perform the check and call.
            if (trigger.props && typeof (trigger.props as any).onClick === 'function') {
                (trigger.props as any).onClick(e);
            }
        },
        'aria-haspopup': 'true',
        'aria-expanded': isOpen,
    });
    
    return (
        <>
            {clonedTrigger}
            {isOpen && createPortal(
                <div
                    ref={dropdownRef}
                    style={{ 
                        top: `${position.top}px`, 
                        left: position.left !== undefined ? `${position.left}px` : 'auto',
                        right: position.right !== undefined ? `${position.right}px` : 'auto',
                    }}
                    className={`fixed origin-top-left rounded-md shadow-lg bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none z-50 ${menuClasses}`}
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