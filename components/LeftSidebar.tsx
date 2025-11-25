
import React, { useState, useEffect } from 'react';
import { Project, SelectableItem, OutlineSection, Note, TaskList, Character } from '../types';
import { SaveStatus, ActiveTab } from './WritingWorkspace';
import StatusIndicator from './StatusIndicator';
import Dropdown from './Dropdown';
import ConfirmModal from './ConfirmModal';
import Logo from './Logo';

interface LeftSidebarProps {
  project: Project;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  selectedItem: SelectableItem | null;
  onSelectItem: (item: SelectableItem) => void;
  onBack: () => void;
  onUpdateOutlineTitle: (id: string, newTitle: string) => void;
  onToggleOutlineExport: (id: string) => void;
  onAddSubItem: (parentId: string) => void;
  onAddRootItem: () => void;
  onDeleteOutlineSection: (id: string) => void;
  onReorderOutline: (draggedId: string, targetId: string, position: 'above' | 'below' | 'on') => void;
  onAddNote: () => void;
  onDeleteNoteRequest: (note: Note) => void;
  onAddTaskList: () => void;
  onDeleteTaskListRequest: (list: TaskList) => void;
  saveStatus: SaveStatus;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onTriggerAdvisor: (advisorName: string) => void;
  width: number;
  isResizing: boolean;
}

const ADVISORS = [
  { name: "Dan Harmon's Story Circle", description: "8 steps focused on character change." },
  { name: "The Hero's Journey", description: "Joseph Campbell's classic mythic structure." },
  { name: "Save the Cat!", description: "Blake Snyder's beat sheet for pacing." },
  { name: "Three-Act Structure", description: "Standard Setup, Confrontation, Resolution." },
  { name: "Kishōtenketsu", description: "Introduction, Development, Twist, Conclusion." },
  { name: "Fichtean Curve", description: "Series of crises leading to a climax." },
  { name: "Seven-Point Structure", description: "Focuses on the rise and fall of tension." },
  { name: "The Snowflake Method", description: "Expands from a single sentence outwards." },
];

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

const EllipsisVerticalIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
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

const CheckCircleIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
);

const ChevronDoubleLeftIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m18.75 4.5-7.5 7.5 7.5 7.5m-6-15L5.25 12l7.5 7.5" />
    </svg>
);

const ChevronDoubleRightIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m5.25 4.5 7.5 7.5-7.5 7.5m6-15 7.5 7.5-7.5-7.5" />
    </svg>
);

const ArrowUturnLeftIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
  </svg>
);

const ArrowUturnRightIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m15 15 6-6m0 0-6-6m6 6H9a6 6 0 0 0 0 12h3" />
  </svg>
);

const AcademicCapIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 0 0-.491 6.347A48.627 48.627 0 0 1 12 20.904a48.627 48.627 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.57 50.57 0 0 0-5.217 0-5.217 50.57 0 0 0-5.217-5.217m0 0c.838 1.657 1.874 3.238 3.086 4.728m0 0a50.57 50.57 0 0 1 5.217 5.217m-15.482 0a50.557 50.557 0 0 1 12-5.73m-12 5.73c.838-1.657 1.874-3.238 3.086-4.728m0 0a50.557 50.557 0 0 1 12 5.73M9 10l3 3m-3-3l-3 3m3-3v10" />
  </svg>
);

const ShareIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" />
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
    onToggleOutlineExport: (id: string) => void;
    onAddSubItem: (parentId: string) => void;
    onDeleteOutlineSection: (id: string) => void;
    draggedItemId: string | null;
    setDraggedItemId: (id: string | null) => void;
    dragOverInfo: DragOverInfo | null;
    setDragOverInfo: (info: DragOverInfo | null) => void;
    onReorderOutline: (draggedId: string, targetId: string, position: 'above' | 'below' | 'on') => void;
}

const OutlineItem: React.FC<OutlineItemProps> = ({
    item, level, selectedItem, onSelectItem, onUpdateOutlineTitle, onToggleOutlineExport, onAddSubItem, onDeleteOutlineSection,
    draggedItemId, setDraggedItemId, dragOverInfo, setDragOverInfo, onReorderOutline
}) => {
    const [isOpen, setIsOpen] = useState(true);
    const [inputValue, setInputValue] = useState(item.title);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const hasChildren = item.children && item.children.length > 0;
    const isSelected = selectedItem?.id === item.id;
    const isBeingDragged = draggedItemId === item.id;
    const isDragTarget = dragOverInfo?.id === item.id;

    useEffect(() => {
        setInputValue(item.title);
    }, [item.title]);

    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData('text/plain', item.id);
        e.dataTransfer.effectAllowed = 'move';
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
            <ConfirmModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={() => {
                    onDeleteOutlineSection(item.id);
                    setIsConfirmOpen(false);
                }}
                title="Delete Section"
                confirmButtonText="Delete"
            >
                <p>
                    Are you sure you want to delete <strong className="font-semibold text-white">"{item.title}"</strong>?
                    {hasChildren && " All of its sub-items will also be permanently deleted."} This action cannot be undone.
                </p>
            </ConfirmModal>

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
                    <input
                        type="checkbox"
                        checked={item.includeInExport ?? true}
                        onChange={() => onToggleOutlineExport(item.id)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Include ${item.title} in export`}
                        title="Include in export"
                        className="ml-1 form-checkbox h-4 w-4 bg-gray-600 border-gray-500 rounded text-cyan-500 focus:ring-cyan-600 cursor-pointer"
                    />
                    {hasChildren ? (
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            aria-expanded={isOpen}
                            aria-label={isOpen ? `Collapse ${item.title}` : `Expand ${item.title}`}
                            className="p-1 rounded-full hover:bg-gray-600 text-gray-400 ml-1 flex-shrink-0"
                        >
                            <ChevronDownIcon className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90'}`} />
                        </button>
                    ) : (
                        <div className="w-6 ml-1 flex-shrink-0"></div>
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
                <div className="ml-2 flex-shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <Dropdown
                        trigger={
                            <button
                                aria-label={`Actions for ${item.title}`}
                                className="p-1 rounded-full text-gray-400 hover:bg-gray-600 hover:text-white"
                            >
                                <EllipsisVerticalIcon className="h-4 w-4" />
                            </button>
                        }
                        menuClasses="w-40"
                    >
                        {(close) => (
                            <div className="py-1" role="none">
                                <button
                                    onClick={() => { onAddSubItem(item.id); close(); }}
                                    className="w-full text-left text-gray-300 block px-4 py-2 text-sm hover:bg-gray-700 hover:text-white"
                                    role="menuitem"
                                >
                                    Add Sub-item
                                </button>
                                <button
                                    onClick={() => { setIsConfirmOpen(true); close(); }}
                                    className="w-full text-left text-red-400 block px-4 py-2 text-sm hover:bg-gray-700 hover:text-red-300"
                                    role="menuitem"
                                >
                                    Delete Section
                                </button>
                            </div>
                        )}
                    </Dropdown>
                </div>
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
                            onToggleOutlineExport={onToggleOutlineExport}
                            onAddSubItem={onAddSubItem}
                            onDeleteOutlineSection={onDeleteOutlineSection}
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

const SimpleListItem: React.FC<{
    title: string;
    isSelected: boolean;
    onSelect: () => void;
    onDeleteRequest: () => void;
    deleteLabel: string;
}> = ({ title, isSelected, onSelect, onDeleteRequest, deleteLabel }) => {
    return (
        <li className={`group flex items-center justify-between rounded-md my-1 pr-2 transition-colors duration-150 ${isSelected ? 'bg-cyan-600/20' : 'hover:bg-gray-700/50'}`}>
            <a
                href="#"
                onClick={(e) => { e.preventDefault(); onSelect(); }}
                className={`block p-2 rounded-md text-sm flex-grow truncate transition-all duration-200 ${isSelected ? 'text-cyan-300 font-semibold' : 'text-gray-300 group-hover:text-white'}`}
            >
                {title}
            </a>
            <div className="ml-2 flex-shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                <Dropdown
                    trigger={
                        <button
                            aria-label={`Actions for ${title}`}
                            className="p-1 rounded-full text-gray-400 hover:bg-gray-600 hover:text-white"
                        >
                            <EllipsisVerticalIcon className="h-4 w-4" />
                        </button>
                    }
                    menuClasses="w-40"
                >
                    {(close) => (
                        <div className="py-1" role="none">
                            <button
                                onClick={() => { onDeleteRequest(); close(); }}
                                className="w-full text-left text-red-400 block px-4 py-2 text-sm hover:bg-gray-700 hover:text-red-300"
                                role="menuitem"
                            >
                                {deleteLabel}
                            </button>
                        </div>
                    )}
                </Dropdown>
            </div>
        </li>
    );
};


const LeftSidebar: React.FC<LeftSidebarProps> = ({ 
    project, activeTab, setActiveTab, selectedItem, onSelectItem, onBack, 
    onUpdateOutlineTitle, onToggleOutlineExport, onAddSubItem, onAddRootItem, 
    onDeleteOutlineSection, onReorderOutline, onAddNote, onDeleteNoteRequest, 
    onAddTaskList, onDeleteTaskListRequest,
    saveStatus, isCollapsed, onToggleCollapse,
    onUndo, onRedo, canUndo, canRedo, onTriggerAdvisor,
    width, isResizing
}) => {
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverInfo, setDragOverInfo] = useState<DragOverInfo | null>(null);

  const navItems = [
    { id: 'outline', label: 'Outline', icon: <ListBulletIcon className="h-6 w-6" /> },
    { id: 'characters', label: 'Characters', icon: <UsersIcon className="h-6 w-6" /> },
    { id: 'notes', label: 'Notes', icon: <DocumentTextIcon className="h-6 w-6" /> },
    { id: 'tasks', label: 'Tasks', icon: <CheckCircleIcon className="h-6 w-6" /> },
    { id: 'graph', label: 'Story Graph', icon: <ShareIcon className="h-6 w-6" /> },
  ];

  // Group characters for sidebar display
  const groupedCharacters: Record<string, Character[]> = {};
  project.characters.forEach(char => {
      const groupName = char.group || "Ungrouped";
      if (!groupedCharacters[groupName]) {
          groupedCharacters[groupName] = [];
      }
      groupedCharacters[groupName].push(char);
  });

  return (
    <aside 
        className={`bg-gray-800 flex flex-col overflow-hidden relative ${isResizing ? '' : 'transition-all duration-300 ease-in-out'}`}
        style={{ width: isCollapsed ? '80px' : `${width}px`, padding: isCollapsed ? '0.5rem' : '1rem' }}
    >
      <button
        onClick={onToggleCollapse}
        className={`absolute z-10 transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
            isCollapsed
            ? 'top-1/2 -translate-y-1/2 right-[-16px] bg-gray-700 text-gray-300 hover:bg-cyan-600 hover:text-white h-8 w-8 rounded-full flex items-center justify-center border-2 border-gray-800'
            : 'top-4 right-4 p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white'
        }`}
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
        {isCollapsed ? <ChevronDoubleRightIcon className="h-5 w-5" /> : <ChevronDoubleLeftIcon className="h-5 w-5" />}
      </button>

      <header className="mb-4">
        <div className={`mb-3 ${isCollapsed ? 'flex justify-center' : ''}`}>
          <Logo showText={!isCollapsed} />
        </div>
        <button onClick={onBack} className={`flex items-center text-sm text-cyan-400 hover:text-cyan-300 mb-3 transition-colors w-full ${isCollapsed ? 'justify-center p-2 rounded-md hover:bg-gray-700' : ''}`}>
            <ArrowLeftIcon className={`h-5 w-5 ${isCollapsed ? '' : 'mr-2'}`} />
            <span className={isCollapsed ? 'hidden' : ''}>Back to Projects</span>
        </button>
        <div className={isCollapsed ? 'hidden' : ''}>
            <h1 className="text-2xl font-bold truncate pr-8">{project.title}</h1>
            <h2 className="text-sm text-gray-400 mb-2">{project.genre}</h2>
            
            <div className="flex items-center gap-1 mt-2 mb-2">
                <button 
                    onClick={onUndo} 
                    disabled={!canUndo} 
                    className="p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400 rounded hover:bg-gray-700" 
                    title="Undo (Ctrl+Z)"
                >
                    <ArrowUturnLeftIcon className="h-5 w-5" />
                </button>
                <button 
                    onClick={onRedo} 
                    disabled={!canRedo} 
                    className="p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400 rounded hover:bg-gray-700" 
                    title="Redo (Ctrl+Shift+Z)"
                >
                    <ArrowUturnRightIcon className="h-5 w-5" />
                </button>

                <div className="w-px h-4 bg-gray-700 mx-1"></div>

                <Dropdown
                    trigger={
                        <button
                            className="flex items-center gap-1 px-2 py-1 text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
                            title="Story Advisors"
                        >
                             <AcademicCapIcon className="h-5 w-5" />
                             <span>Advisors</span>
                        </button>
                    }
                    menuClasses="w-64"
                >
                    {(close) => (
                        <div className="py-1" role="none">
                             <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-700">
                                Select an Advisor
                            </div>
                            {ADVISORS.map((advisor) => (
                                <button
                                    key={advisor.name}
                                    onClick={() => { onTriggerAdvisor(advisor.name); close(); }}
                                    className="w-full text-left px-4 py-3 hover:bg-gray-700 transition-colors group"
                                    role="menuitem"
                                >
                                    <div className="text-sm font-medium text-gray-200 group-hover:text-white">{advisor.name}</div>
                                    <div className="text-xs text-gray-500 group-hover:text-gray-400">{advisor.description}</div>
                                </button>
                            ))}
                        </div>
                    )}
                </Dropdown>

                <div className="flex-grow"></div>
                <StatusIndicator status={saveStatus} />
            </div>
        </div>
      </header>

      <nav className={`border-b border-gray-700 mb-4 p-1 bg-gray-900/50 rounded-lg ${isCollapsed ? 'flex flex-col items-center gap-1' : 'flex justify-around items-center'}`}>
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

      <div className={`flex-grow overflow-y-auto pr-2 ${isCollapsed ? 'hidden' : ''}`}>
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
                            onToggleOutlineExport={onToggleOutlineExport}
                            onAddSubItem={onAddSubItem}
                            onDeleteOutlineSection={onDeleteOutlineSection}
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
             <div className="space-y-4">
                 {Object.entries(groupedCharacters).length > 0 ? (
                    Object.entries(groupedCharacters).map(([groupName, characters]) => (
                        <div key={groupName}>
                            {groupName !== "Ungrouped" && (
                                <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                    {groupName}
                                </div>
                            )}
                            <ul>
                                {characters.map(item => (
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
                        </div>
                    ))
                 ) : (
                    <div className="text-gray-500 text-sm text-center italic py-4">No characters yet.</div>
                 )}
            </div>
        )}
        {activeTab === 'notes' && (
            <>
                <div className="px-1 mb-2">
                    <button
                        onClick={onAddNote}
                        className="w-full flex items-center justify-center p-2 rounded-md text-sm bg-gray-700 hover:bg-gray-600 text-cyan-400 font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        aria-label="Add new note"
                    >
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Add New Note
                    </button>
                </div>
                <ul>
                    {project.notes.map(note => (
                        <SimpleListItem
                            key={note.id}
                            title={note.title}
                            isSelected={selectedItem?.id === note.id}
                            onSelect={() => onSelectItem(note)}
                            onDeleteRequest={() => onDeleteNoteRequest(note)}
                            deleteLabel="Delete Note"
                        />
                    ))}
                </ul>
            </>
        )}
         {activeTab === 'tasks' && (
            <>
                <div className="px-1 mb-2">
                    <button
                        onClick={onAddTaskList}
                        className="w-full flex items-center justify-center p-2 rounded-md text-sm bg-gray-700 hover:bg-gray-600 text-cyan-400 font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        aria-label="Add new list"
                    >
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Add New List
                    </button>
                </div>
                <ul>
                    {(project.taskLists || []).map(list => (
                         <SimpleListItem
                            key={list.id}
                            title={list.title}
                            isSelected={selectedItem?.id === list.id}
                            onSelect={() => onSelectItem(list)}
                            onDeleteRequest={() => onDeleteTaskListRequest(list)}
                            deleteLabel="Delete List"
                        />
                    ))}
                </ul>
            </>
        )}
        {activeTab === 'graph' && (
            <div className="text-center p-4 text-gray-400 text-sm italic">
                Visualize your story's structure. Click nodes to jump to editors.
            </div>
        )}
      </div>
    </aside>
  );
};

export default LeftSidebar;
