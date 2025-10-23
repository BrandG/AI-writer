
import React, { useState, useEffect } from 'react';
import { Project, SelectableItem, OutlineSection } from '../types';
import { SaveStatus, ActiveTab } from './WritingWorkspace';
import StatusIndicator from './StatusIndicator';

interface LeftSidebarProps {
  project: Project;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  selectedItem: SelectableItem | null;
  onSelectItem: (item: SelectableItem) => void;
  onBack: () => void;
  onUpdateOutlineTitle: (id: string, newTitle: string) => void;
  onAddSubItem: (parentId: string) => void;
  onAddRootItem: () => void;
  onReorderOutline: (draggedId: string, targetId: string, position: 'above' | 'below' | 'on') => void;
  saveStatus: SaveStatus;
}

const ArrowLeftIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
);

const PlusIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
);

const ChevronDownIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
);

const ListBulletIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
);

const UsersIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-4.663M12 12.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Z" />
    </svg>
);

const DocumentTextIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
);

interface DragOverInfo {
    id: string;
    position: 'above' | 'below' | 'on';
}

interface OutlineItemProps {
    item: OutlineSection;
    level: number;
    selectedItem: SelectableItem | null;
    onSelectItem: (item: SelectableItem) => void;
    onUpdateOutlineTitle: (id: string, newTitle: string) => void;
    onAddSubItem: (parentId: string) => void;
    draggedItemId: string | null;
    setDraggedItemId: (id: string | null) => void;
    dragOverInfo: DragOverInfo | null;
    setDragOverInfo: (info: DragOverInfo | null) => void;
    onReorderOutline: (draggedId: string, targetId: string, position: 'above' | 'below' | 'on') => void;
}

const OutlineItem: React.FC<OutlineItemProps> = ({
    item, level, selectedItem, onSelectItem, onUpdateOutlineTitle, onAddSubItem,
    draggedItemId, setDraggedItemId, dragOverInfo, setDragOverInfo, onReorderOutline
}) => {
    const [isOpen, setIsOpen] = useState(true);
    // Use local state for the input to make it a controlled component
    const [inputValue, setInputValue] = useState(item.title);
    const hasChildren = item.children && item.children.length > 0;
    const isSelected = selectedItem?.id === item.id;
    const isBeingDragged = draggedItemId === item.id;
    const isDragTarget = dragOverInfo?.id === item.id;

    // Sync local state if the prop changes from outside (e.g., from AI update)
    useEffect(() => {
        setInputValue(item.title);
    }, [item.title]);

    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData('text/plain', item.id);
        e.dataTransfer.effectAllowed = 'move';
        // Use a timeout to allow the browser to render the drag image before updating state
        setTimeout(() => setDraggedItemId(item.id), 0);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        if (draggedItemId === item.id) return;

        const rect = (e.currentTarget as HTMLLIElement).getBoundingClientRect();
        const y = e.clientY - rect.top;
        const height = rect.height;

        let position: 'above' | 'below' | 'on' = 'on';
        if (y < height * 0.25) {
            position = 'above';
        } else if (y > height * 0.75) {
            position = 'below';
        }
        
        if (dragOverInfo?.id !== item.id || dragOverInfo?.position !== position) {
            setDragOverInfo({ id: item.id, position });
        }
    };
    
    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        // Check if the mouse is leaving the element entirely, not just moving to a child
        if (!(e.currentTarget as HTMLLIElement).contains(e.relatedTarget as Node)) {
             setDragOverInfo(null);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const draggedId = e.dataTransfer.getData('text/plain');
        if (draggedId && draggedId !== item.id && dragOverInfo) {
            onReorderOutline(draggedId, item.id, dragOverInfo.position);
        }
        cleanupDragState();
    };

    const cleanupDragState = () => {
        setDraggedItemId(null);
        setDragOverInfo(null);
    };
    
    const handleBlur = () => {
        const newTitle = inputValue.trim();
        if (newTitle && newTitle !== item.title) {
            onUpdateOutlineTitle(item.id, newTitle);
        } else {
            // If the title is empty or unchanged, revert to the original prop value
            setInputValue(item.title);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            (e.target as HTMLInputElement).blur();
        } else if (e.key === 'Escape') {
            setInputValue(item.title);
            (e.target as HTMLInputElement).blur();
        }
    };


    return (
        <li className="relative">
             {isDragTarget && dragOverInfo.position === 'above' && <div className="absolute top-0 left-0 right-0 h-0.5 bg-cyan-400 z-10"></div>}
            <div
                draggable="true"
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onDragEnd={cleanupDragState}
                className={`group flex items-center justify-between rounded-md my-1 transition-colors duration-150 ${isBeingDragged ? 'opacity-40' : 'opacity-100'} ${isDragTarget && dragOverInfo.position === 'on' ? 'bg-gray-700' : ''}`}
                style={{ paddingLeft: `${level * 1.5}rem` }}
            >
                <div className="flex items-center flex-grow min-w-0">
                    {hasChildren ? (
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            aria-expanded={isOpen}
                            aria-label={isOpen ? `Collapse ${item.title}` : `Expand ${item.title}`}
                            className="p-1 rounded-full hover:bg-gray-600 text-gray-400 mr-1 flex-shrink-0"
                        >
                            <ChevronDownIcon className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90'}`} />
                        </button>
                    ) : (
                        <div className="w-6 mr-1 flex-shrink-0"></div>
                    )}
                    <input
                      type="text"
                      value={inputValue}
                      aria-label="Editable outline section title"
                      onFocus={() => onSelectItem(item)}
                      onChange={(e) => setInputValue(e.target.value)}
                      onBlur={handleBlur}
                      onKeyDown={handleKeyDown}
                      className={`w-full p-2 rounded-md text-sm transition-all duration-200 bg-transparent border-0 focus:outline-none focus:bg-gray-700 focus:ring-0 ${isSelected ? 'bg-cyan-600/20 text-cyan-300 font-semibold' : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'}`}
                    />
                </div>
                <button
                  onClick={() => onAddSubItem(item.id)}
                  aria-label={`Add sub-item to ${item.title}`}
                  className="ml-2 p-1 rounded-full text-gray-400 hover:bg-gray-600 hover:text-white opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity flex-shrink-0"
                >
                    <PlusIcon className="h-4 w-4" />
                </button>
            </div>
             {isDragTarget && dragOverInfo.position === 'below' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 z-10"></div>}
            {isOpen && hasChildren && (
                <ul>
                    {item.children.map(child => (
                        <OutlineItem
                            key={child.id}
                            item={child}
                            level={level + 1}
                            selectedItem={selectedItem}
                            onSelectItem={onSelectItem}
                            onUpdateOutlineTitle={onUpdateOutlineTitle}
                            onAddSubItem={onAddSubItem}
                            draggedItemId={draggedItemId}
                            setDraggedItemId={setDraggedItemId}
                            dragOverInfo={dragOverInfo}
                            setDragOverInfo={setDragOverInfo}
                            onReorderOutline={onReorderOutline}
                        />
                    ))}
                </ul>
            )}
        </li>
    );
};


const LeftSidebar: React.FC<LeftSidebarProps> = ({ project, activeTab, setActiveTab, selectedItem, onSelectItem, onBack, onUpdateOutlineTitle, onAddSubItem, onAddRootItem, onReorderOutline, saveStatus }) => {
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverInfo, setDragOverInfo] = useState<DragOverInfo | null>(null);

  const navItems = [
    { id: 'outline', label: 'Outline', icon: <ListBulletIcon className="h-6 w-6" /> },
    { id: 'characters', label: 'Characters', icon: <UsersIcon className="h-6 w-6" /> },
    { id: 'notes', label: 'Notes', icon: <DocumentTextIcon className="h-6 w-6" /> },
  ];

  return (
    <aside className="w-1/4 max-w-xs bg-gray-800 flex flex-col p-4 border-r border-gray-700">
      <header className="mb-4">
        <button onClick={onBack} className="flex items-center text-sm text-cyan-400 hover:text-cyan-300 mb-3 transition-colors">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Projects
        </button>
        <h1 className="text-2xl font-bold truncate">{project.title}</h1>
        <h2 className="text-sm text-gray-400 mb-2">{project.genre}</h2>
        <StatusIndicator status={saveStatus} />
      </header>

      <nav className="flex justify-around items-center border-b border-gray-700 mb-4 p-1 bg-gray-900/50 rounded-lg">
        {navItems.map(navItem => (
            <button
                key={navItem.id}
                onClick={() => setActiveTab(navItem.id as ActiveTab)}
                aria-pressed={activeTab === navItem.id}
                title={navItem.label}
                className={`p-2 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 ${activeTab === navItem.id ? 'bg-cyan-600/20 text-cyan-300' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
            >
                {navItem.icon}
            </button>
        ))}
      </nav>

      <div className="flex-grow overflow-y-auto pr-2">
        {activeTab === 'outline' && (
             <>
                <div className="px-1 mb-2">
                    <button
                        onClick={onAddRootItem}
                        className="w-full flex items-center justify-center p-2 rounded-md text-sm bg-gray-700 hover:bg-gray-600 text-cyan-400 font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        aria-label="Add new root section to outline"
                    >
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Add New Section
                    </button>
                </div>
                <ul>
                    {project.outline.map(item => (
                        <OutlineItem
                            key={item.id}
                            item={item}
                            level={0}
                            selectedItem={selectedItem}
                            onSelectItem={onSelectItem}
                            onUpdateOutlineTitle={onUpdateOutlineTitle}
                            onAddSubItem={onAddSubItem}
                            draggedItemId={draggedItemId}
                            setDraggedItemId={setDraggedItemId}
                            dragOverInfo={dragOverInfo}
                            setDragOverInfo={setDragOverInfo}
                            onReorderOutline={onReorderOutline}
                        />
                    ))}
                </ul>
            </>
        )}
        {activeTab === 'characters' && (
             <ul>
                {project.characters.map(item => (
                    <li key={item.id}>
                        <a
                        href="#"
                        onClick={(e) => { e.preventDefault(); onSelectItem(item); }}
                        className={`block p-3 my-1 rounded-md text-sm transition-all duration-200 ${selectedItem?.id === item.id ? 'bg-cyan-600/20 text-cyan-300 font-semibold' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                        >
                        {item.name}
                        </a>
                    </li>
                ))}
            </ul>
        )}
        {/* The list area is intentionally empty for the 'notes' tab */}
      </div>
    </aside>
  );
};

export default LeftSidebar;