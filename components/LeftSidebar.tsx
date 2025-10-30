import React, { useState, useEffect } from 'react';
import { Project, SelectableItem, OutlineSection, Note } from '../types';
import { SaveStatus, ActiveTab } from './WritingWorkspace';
import StatusIndicator from './StatusIndicator';
import Dropdown from './Dropdown';
import ConfirmModal from './ConfirmModal';

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

const NoteItem: React.FC<{
    note: Note;
    isSelected: boolean;
    onSelect: () => void;
    onDeleteRequest: () => void;
}> = ({ note, isSelected, onSelect, onDeleteRequest }) => {
    return (
        <li className={`group flex items-center justify-between rounded-md my-1 pr-2 transition-colors duration-150 ${isSelected ? 'bg-cyan-600/20' : 'hover:bg-gray-700/50'}`}>
            <a
                href="#"
                onClick={(e) => { e.preventDefault(); onSelect(); }}
                className={`block p-2 rounded-md text-sm flex-grow truncate transition-all duration-200 ${isSelected ? 'text-cyan-300 font-semibold' : 'text-gray-300 group-hover:text-white'}`}
            >
                {note.title}
            </a>
            <div className="ml-2 flex-shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                <Dropdown
                    trigger={
                        <button
                            aria-label={`Actions for ${note.title}`}
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
                                Delete Note
                            </button>
                        </div>
                    )}
                </Dropdown>
            </div>
        </li>
    );
};


const LeftSidebar: React.FC<LeftSidebarProps> = ({ project, activeTab, setActiveTab, selectedItem, onSelectItem, onBack, onUpdateOutlineTitle, onToggleOutlineExport, onAddSubItem, onAddRootItem, onDeleteOutlineSection, onReorderOutline, onAddNote, onDeleteNoteRequest, saveStatus }) => {
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
                        <NoteItem
                            key={note.id}
                            note={note}
                            isSelected={selectedItem?.id === note.id}
                            onSelect={() => onSelectItem(note)}
                            onDeleteRequest={() => onDeleteNoteRequest(note)}
                        />
                    ))}
                </ul>
            </>
        )}
      </div>
    </aside>
  );
};

export default LeftSidebar;