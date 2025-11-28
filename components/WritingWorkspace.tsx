
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Project, SelectableItem, OutlineSection, Character, ChatMessage, AiService, Note, AiPersonality, TaskList, Task } from '../types';
import LeftSidebar from './LeftSidebar';
import MainContent from './MainContent';
import ChatSidebar from './ChatSidebar';
import { v4 as uuidv4 } from 'uuid';
import { deleteImage } from '../services/imageDbService';
import ConfirmModal from './ConfirmModal';


// Recursive helper to update a title in a nested structure
const updateTitleRecursively = (sections: OutlineSection[], sectionId: string, newTitle: string): OutlineSection[] => {
    return sections.map(section => {
        if (section.id === sectionId) {
            return { ...section, title: newTitle };
        }
        if (section.children) {
            return { ...section, children: updateTitleRecursively(section.children, sectionId, newTitle) };
        }
        return section;
    });
};

// Recursive helper to add a sub-item in a nested structure
const addSubItemRecursively = (sections: OutlineSection[], parentId: string, newItem: OutlineSection): OutlineSection[] => {
    return sections.map(section => {
        if (section.id === parentId) {
            const children = section.children ? [...section.children, newItem] : [newItem];
            return { ...section, children };
        }
        if (section.children) {
            return { ...section, children: addSubItemRecursively(section.children, parentId, newItem) };
        }
        return section;
    });
};

// Recursive helper to update content
const updateContentRecursively = (sections: OutlineSection[], sectionId: string, newContent: string): OutlineSection[] => {
    return sections.map(section => {
        if (section.id === sectionId) {
            return { ...section, content: newContent };
        }
        if (section.children) {
            return { ...section, children: updateContentRecursively(section.children, sectionId, newContent) };
        }
        return section;
    });
};

// Recursive helper to update any fields
const updateSectionRecursively = (sections: OutlineSection[], sectionId: string, updates: Partial<OutlineSection>): OutlineSection[] => {
    return sections.map(section => {
        if (section.id === sectionId) {
            return { ...section, ...updates };
        }
        if (section.children) {
            return { ...section, children: updateSectionRecursively(section.children, sectionId, updates) };
        }
        return section;
    });
};


const deleteSectionRecursively = (sections: OutlineSection[], sectionId: string): OutlineSection[] => {
    return sections
        .filter(section => section.id !== sectionId)
        .map(section => {
            if (section.children) {
                return { ...section, children: deleteSectionRecursively(section.children, sectionId) };
            }
            return section;
        });
};


// Recursive helper to toggle character association
const toggleCharacterAssociationRecursively = (sections: OutlineSection[], sectionId: string, characterId: string): OutlineSection[] => {
    return sections.map(section => {
        if (section.id === sectionId) {
            const currentIds = section.characterIds || [];
            const newIds = currentIds.includes(characterId)
                ? currentIds.filter(id => id !== characterId)
                : [...currentIds, characterId];
            return { ...section, characterIds: newIds };
        }
        if (section.children) {
            return { ...section, children: toggleCharacterAssociationRecursively(section.children, sectionId, characterId) };
        }
        return section;
    });
};

// Recursive helper to toggle export status
const toggleExportRecursively = (sections: OutlineSection[], sectionId: string): OutlineSection[] => {
    return sections.map(section => {
        if (section.id === sectionId) {
            return { ...section, includeInExport: !(section.includeInExport ?? true) };
        }
        if (section.children) {
            return { ...section, children: toggleExportRecursively(section.children, sectionId) };
        }
        return section;
    });
};

interface WritingWorkspaceProps {
  project: Project;
  onBack: () => void;
  onUpdateProject: (updatedProject: Project) => Promise<void>;
  aiService: AiService;
}

export type SaveStatus = 'unsaved' | 'saving' | 'saved' | 'error';
export type ActiveTab = 'outline' | 'characters' | 'notes' | 'tasks' | 'graph';

const MAX_HISTORY = 50;
const MIN_SIDEBAR_WIDTH = 250;
const MAX_SIDEBAR_WIDTH = 800;

const WritingWorkspace: React.FC<WritingWorkspaceProps> = ({ project, onBack, onUpdateProject, aiService }) => {
  const [history, setHistory] = useState<{
    past: Project[];
    present: Project;
    future: Project[];
  }>({
    past: [],
    present: project,
    future: []
  });
  const currentProject = history.present;

  const [activeTab, setActiveTab] = useState<ActiveTab>('outline');
  const [selectedItem, setSelectedItem] = useState<SelectableItem | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // State to hold the full conversation history for the API
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingIllustration, setIsGeneratingIllustration] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isChatSidebarCollapsed, setIsChatSidebarCollapsed] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [characterToDelete, setCharacterToDelete] = useState<Character | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  const [taskListToDelete, setTaskListToDelete] = useState<TaskList | null>(null);
  const [aiPersonality, setAiPersonality] = useState<AiPersonality>(
    () => (localStorage.getItem('aiPersonality') as AiPersonality) || 'assistant'
  );

  // Resize state
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(300);
  const [chatSidebarWidth, setChatSidebarWidth] = useState(350);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingChat, setIsResizingChat] = useState(false);

  // Track the current project ID to differentiate between a project switch and a data update.
  const [currentProjectId, setCurrentProjectId] = useState<string>(project.id);

  const toggleSidebar = () => setIsSidebarCollapsed(prev => !prev);
  const toggleChatSidebar = () => setIsChatSidebarCollapsed(prev => !prev);
  const debounceTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    localStorage.setItem('aiPersonality', aiPersonality);
  }, [aiPersonality]);

    // Resize Handlers
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isResizingLeft) {
                const newWidth = Math.min(Math.max(e.clientX, MIN_SIDEBAR_WIDTH), MAX_SIDEBAR_WIDTH);
                setLeftSidebarWidth(newWidth);
            } else if (isResizingChat) {
                const newWidth = Math.min(Math.max(window.innerWidth - e.clientX, MIN_SIDEBAR_WIDTH), MAX_SIDEBAR_WIDTH);
                setChatSidebarWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            setIsResizingLeft(false);
            setIsResizingChat(false);
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto';
        };

        if (isResizingLeft || isResizingChat) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto';
        };
    }, [isResizingLeft, isResizingChat]);

    // Undo/Redo logic
    const undo = useCallback(() => {
        setHistory(prev => {
            if (prev.past.length === 0) return prev;
            const newPresent = prev.past[prev.past.length - 1];
            const newPast = prev.past.slice(0, -1);
            return {
                past: newPast,
                present: newPresent,
                future: [prev.present, ...prev.future]
            };
        });
    }, []);

    const redo = useCallback(() => {
        setHistory(prev => {
            if (prev.future.length === 0) return prev;
            const newPresent = prev.future[0];
            const newFuture = prev.future.slice(1);
            return {
                past: [...prev.past, prev.present],
                present: newPresent,
                future: newFuture
            };
        });
    }, []);

    const updateProjectState = useCallback((updateFn: (prev: Project) => Project) => {
        setHistory(prev => {
            const newProject = updateFn(prev.present);
            if (newProject === prev.present) return prev;
            return {
                past: [...prev.past, prev.present].slice(-MAX_HISTORY),
                present: newProject,
                future: []
            };
        });
    }, []);

    // Keyboard shortcuts for undo/redo
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    redo();
                } else {
                    undo();
                }
            } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                redo();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo]);


  // Debounced save effect - watches history.present
  useEffect(() => {
    if (currentProject === project) {
        return;
    }
    
    setSaveStatus('unsaved');

    if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = window.setTimeout(async () => {
        setSaveStatus('saving');
        try {
            await onUpdateProject(currentProject);
            setSaveStatus('saved');
        } catch (error) {
            console.error("Debounced save failed:", error);
            setSaveStatus('error');
        }
    }, 1500);

    return () => {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
    };
  }, [currentProject, onUpdateProject, project]);

  // Sync selectedItem with currentProject updates (e.g. from Undo/Redo)
  useEffect(() => {
    if (!selectedItem) return;

    // Find the updated version of the selected item in the current project
    let updatedItem: SelectableItem | undefined;
    
    if (selectedItem.type === 'character') {
        updatedItem = currentProject.characters.find(c => c.id === selectedItem.id);
    } else if (selectedItem.type === 'note') {
        updatedItem = currentProject.notes.find(n => n.id === selectedItem.id);
    } else if (selectedItem.type === 'taskList') {
        updatedItem = currentProject.taskLists?.find(t => t.id === selectedItem.id);
    } else if (selectedItem.type === 'outline') {
        // Recursive find
        const findSection = (sections: OutlineSection[]): OutlineSection | undefined => {
            for (const s of sections) {
                if (s.id === selectedItem.id) return s;
                if (s.children) {
                    const found = findSection(s.children);
                    if (found) return found;
                }
            }
            return undefined;
        }
        updatedItem = findSection(currentProject.outline);
    }

    // If item exists in new state, update selection to match new state
    if (updatedItem && updatedItem !== selectedItem) {
        setSelectedItem(updatedItem);
    } 
    // If item does NOT exist (e.g. we undid a creation or redid a deletion)
    else if (!updatedItem) {
        setSelectedItem(null); 
    }

  }, [currentProject]);


  // This effect handles both switching projects and syncing updates from the parent.
  useEffect(() => {
    // A true project switch (different ID) triggers a full state reset.
    if (project.id !== currentProjectId) {
      setCurrentProjectId(project.id);
      
      // Reset history
      setHistory({
        past: [],
        present: project,
        future: []
      });

      const initialSelectedItem = project.outline[0] || project.characters[0] || project.notes[0] || project.taskLists?.[0] || null;
      setSelectedItem(initialSelectedItem);
      
      let initialTab: ActiveTab = 'outline';
      if (initialSelectedItem?.type === 'character') initialTab = 'characters';
      if (initialSelectedItem?.type === 'note') initialTab = 'notes';
      if (initialSelectedItem?.type === 'taskList') initialTab = 'tasks';
      setActiveTab(initialTab);

      const initialMessage = { role: 'model' as const, text: `Hello! How can I help you with '${project.title}' today?` };
      setMessages([initialMessage]);
      setConversationHistory([{ role: 'assistant', content: initialMessage.text }]);
      setIsLoading(false);
      setSaveStatus('saved');
    } else {
      // Used for initial load mostly. We avoid overwriting history on basic prop updates to preserve undo stack.
      // If we strictly needed to sync external changes, we'd need more complex logic.
      // For now, we trust local history as the source of truth while the workspace is active.
    }
  }, [project, currentProjectId]);

  const handleSetTab = useCallback((tab: ActiveTab) => {
    setActiveTab(tab);
    if (tab === 'notes' && (selectedItem?.type !== 'note' || !selectedItem)) {
        setSelectedItem(currentProject.notes[0] || null);
    } else if (tab === 'characters' && (selectedItem?.type !== 'character' || !selectedItem)) {
        setSelectedItem(currentProject.characters[0] || null);
    } else if (tab === 'outline' && (selectedItem?.type !== 'outline' || !selectedItem)) {
        setSelectedItem(currentProject.outline[0] || null);
    } else if (tab === 'tasks' && (selectedItem?.type !== 'taskList' || !selectedItem)) {
        setSelectedItem(currentProject.taskLists?.[0] || null);
    }
  }, [currentProject, selectedItem]);

  const handleSelectItem = useCallback((item: SelectableItem) => {
    setSelectedItem(item);
    // If we are selecting an item from the graph (or elsewhere), ensure we switch to the appropriate tab
    if (item.type === 'character') setActiveTab('characters');
    else if (item.type === 'outline') setActiveTab('outline');
    else if (item.type === 'note') setActiveTab('notes');
    else if (item.type === 'taskList') setActiveTab('tasks');
  }, []);
  
  const handleUpdateOutlineTitle = (sectionId: string, newTitle: string) => {
    updateProjectState(prevProject => {
        const newOutline = updateTitleRecursively(prevProject.outline, sectionId, newTitle);
        return { ...prevProject, outline: newOutline };
    });
  };

    const handleAddOutlineSection = (args: { parentId?: string; title: string; content?: string }) => {
        const { title, content, parentId } = args;
        const newSection: OutlineSection = {
            id: uuidv4(),
            title: title,
            content: content || '',
            type: 'outline',
            children: [],
            includeInExport: true,
        };

        updateProjectState(prevProject => {
            let newOutline;
            if (parentId) {
                newOutline = addSubItemRecursively(prevProject.outline, parentId, newSection);
            } else {
                newOutline = [...prevProject.outline, newSection];
            }
            return { ...prevProject, outline: newOutline };
        });
        
        // Select the new item explicitly
        setSelectedItem(newSection);

        return { success: true, message: `Section '${title}' added successfully.` };
    };

    const handleUpdateOutlineSection = (args: { sectionId: string; newTitle?: string; newContent?: string }) => {
        const { sectionId, newTitle, newContent } = args;
        const updates: Partial<OutlineSection> = {};
        if (newTitle) updates.title = newTitle;
        if (newContent) updates.content = newContent;

        updateProjectState(prevProject => {
            const newOutline = updateSectionRecursively(prevProject.outline, sectionId, updates);
            return { ...prevProject, outline: newOutline };
        });
        return { success: true, message: `Section updated successfully.` };
    };

    const handleToggleOutlineExport = (sectionId: string) => {
        updateProjectState(prevProject => {
            const newOutline = toggleExportRecursively(prevProject.outline, sectionId);
            return { ...prevProject, outline: newOutline };
        });
    };

    const handleDeleteOutlineSection = (args: { sectionId: string }) => {
        const { sectionId } = args;
        updateProjectState(prevProject => {
            const newOutline = deleteSectionRecursively(prevProject.outline, sectionId);
            return { ...prevProject, outline: newOutline };
        });
        return { success: true, message: "Section deleted successfully." };
    };

    const handleMoveOutlineSection = (args: {
        sectionId: string;
        targetParentId?: string;
        targetSiblingId?: string;
        position?: 'before' | 'after';
    }) => {
        const { sectionId, targetParentId, targetSiblingId, position } = args;

        // Prevent moving a section into itself
        if (sectionId === targetParentId || sectionId === targetSiblingId) return;

        updateProjectState(prevProject => {
            let movedItem: OutlineSection | null = null;

            // 1. Immutably find and remove the item from the tree
            const findAndRemove = (sections: OutlineSection[], id: string): OutlineSection[] => {
                return sections.reduce((acc, section) => {
                    if (section.id === id) {
                        movedItem = { ...section }; // Store a copy
                        return acc;
                    }
                    const newChildren = section.children ? findAndRemove(section.children, id) : undefined;
                    acc.push({ ...section, children: newChildren });
                    return acc;
                }, [] as OutlineSection[]);
            };

            const outlineWithoutMoved = findAndRemove(prevProject.outline, sectionId);
            
            if (!movedItem) return prevProject; // Item not found, do nothing

            // 2. Prevent dropping a parent into one of its own children
            const isDescendant = (node: OutlineSection, parentId: string): boolean => {
                if (node.id === parentId) return true;
                return node.children?.some(child => isDescendant(child, parentId)) ?? false;
            };

            const targetId = targetParentId || targetSiblingId;
            if (targetId && isDescendant(movedItem, targetId)) {
                console.warn("Cannot move a parent section into one of its own children.");
                return prevProject;
            }
            
            // 3. Immutably insert the item into its new location
            const findAndInsert = (sections: OutlineSection[]): OutlineSection[] => {
                // Case A: Drop onto a parent
                if (targetParentId) {
                    return sections.map(section => {
                        if (section.id === targetParentId) {
                            return { ...section, children: [...(section.children || []), movedItem!] };
                        }
                        if (section.children) {
                            return { ...section, children: findAndInsert(section.children) };
                        }
                        return section;
                    });
                }
                // Case B: Drop next to a sibling
                if (targetSiblingId && position) {
                    const targetIndex = sections.findIndex(s => s.id === targetSiblingId);
                    if (targetIndex > -1) {
                        const newSections = [...sections];
                        const insertIndex = position === 'before' ? targetIndex : targetIndex + 1;
                        newSections.splice(insertIndex, 0, movedItem!);
                        return newSections;
                    }
                    // Recurse if sibling not found at this level
                    return sections.map(section => {
                        if (section.children) {
                            return { ...section, children: findAndInsert(section.children) };
                        }
                        return section;
                    });
                }
                return sections; // Should not happen if a target is defined
            };
            
            let newOutline;
            if (targetParentId || targetSiblingId) {
                newOutline = findAndInsert(outlineWithoutMoved);
            } else {
                // No target, becomes a root item
                newOutline = [...outlineWithoutMoved, movedItem];
            }

            return { ...prevProject, outline: newOutline };
        });
        return { success: true, message: 'Section moved successfully.' };
    };
    
    // Character Handlers
    const handleAddCharacter = (args: Omit<Character, 'id' | 'type'>) => {
        const newCharacter: Character = {
            ...args,
            id: uuidv4(),
            type: 'character',
        };
        updateProjectState(prevProject => ({
            ...prevProject,
            characters: [...prevProject.characters, newCharacter],
        }));
        
        setSelectedItem(newCharacter);
        return { success: true, message: `Character '${args.name}' added successfully.` };
    };

    const handleAddManualCharacter = () => {
        const newCharacter: Character = {
            id: uuidv4(),
            type: 'character',
            name: "New Character",
            description: "",
            group: "Ungrouped",
        };
        updateProjectState(prevProject => ({
            ...prevProject,
            characters: [...prevProject.characters, newCharacter],
        }));
        setSelectedItem(newCharacter);
        setActiveTab('characters');
    };

    const handleImportCharacter = (characterData: Omit<Character, 'id' | 'type'>) => {
        const newCharacter: Character = {
            ...characterData,
            id: uuidv4(),
            type: 'character',
        };
        updateProjectState(prevProject => ({
            ...prevProject,
            characters: [...prevProject.characters, newCharacter],
        }));
        setSelectedItem(newCharacter);
        setActiveTab('characters');
    };

    const handleUpdateCharacter = (characterId: string, updatedData: Partial<Character>) => {
        updateProjectState(prevProject => {
            const newCharacters = prevProject.characters.map(char =>
                char.id === characterId ? { ...char, ...updatedData } : char
            );
            return { ...prevProject, characters: newCharacters };
        });
        return { success: true, message: `Character updated successfully.` };
    };
    
    const handleDeleteCharacter = (args: { characterId: string }) => {
        updateProjectState(prevProject => {
            const updatedProject = {
                ...prevProject,
                characters: prevProject.characters.filter(c => c.id !== args.characterId),
            };
            // Also remove character from any outline associations
            const cleanOutline = (sections: OutlineSection[]): OutlineSection[] => {
                return sections.map(section => {
                    const newSection = { ...section };
                    if (newSection.characterIds) {
                        newSection.characterIds = newSection.characterIds.filter(id => id !== args.characterId);
                    }
                    if (newSection.children) {
                        newSection.children = cleanOutline(newSection.children);
                    }
                    return newSection;
                });
            };
            updatedProject.outline = cleanOutline(updatedProject.outline);
            return updatedProject;
        });
        return { success: true, message: "Character deleted successfully." };
    };
    
    // Note Handlers
    const handleAddNote = () => {
        const newNote: Note = {
            id: uuidv4(),
            type: 'note',
            title: 'New Note',
            content: '',
        };
        updateProjectState(prev => ({
            ...prev,
            notes: [...prev.notes, newNote],
        }));
        setSelectedItem(newNote);
    };

    const handleUpdateNote = (noteId: string, updates: Partial<Note>) => {
        updateProjectState(prev => ({
            ...prev,
            notes: prev.notes.map(n => n.id === noteId ? { ...n, ...updates } : n),
        }));
    };

    const handleDeleteNote = (noteId: string) => {
        updateProjectState(prev => {
            const newNotes = prev.notes.filter(n => n.id !== noteId);
            return { ...prev, notes: newNotes };
        });
    };

    // Task List Handlers
    const handleAddTaskList = () => {
        const newList: TaskList = {
            id: uuidv4(),
            type: 'taskList',
            title: 'New List',
            tasks: [],
        };
        updateProjectState(prev => ({
            ...prev,
            taskLists: [...(prev.taskLists || []), newList],
        }));
        setSelectedItem(newList);
    };

    const handleUpdateTaskList = (listId: string, updates: Partial<TaskList>) => {
        updateProjectState(prev => ({
            ...prev,
            taskLists: (prev.taskLists || []).map(l => l.id === listId ? { ...l, ...updates } : l),
        }));
    };

    const handleDeleteTaskList = (listId: string) => {
        updateProjectState(prev => {
            const newLists = (prev.taskLists || []).filter(l => l.id !== listId);
            return { ...prev, taskLists: newLists };
        });
    };

    // Chat to Note Handler
    const handleSaveChatToNote = (chatMessages: ChatMessage[]) => {
        if (chatMessages.length === 0) return;

        const formattedChat = chatMessages.map(m => {
            const role = m.role === 'user' ? 'User' : 'AI';
            return `**${role}:** ${m.text}`;
        }).join('\n\n');

        const newNote: Note = {
            id: uuidv4(),
            type: 'note',
            title: `Chat Session - ${new Date().toLocaleString()}`,
            content: formattedChat,
        };

        updateProjectState(prev => ({
            ...prev,
            notes: [...prev.notes, newNote],
        }));

        setSelectedItem(newNote);
        setActiveTab('notes');
    };

    const handleExportProject = () => {
        // Wrap in array to match the import format expectation
        const dataStr = JSON.stringify([currentProject], null, 2);
        const dataBlob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');

        // Create a safe filename
        const safeTitle = currentProject.title.replace(/[^a-z0-9\-_ ]/gi, '').trim().replace(/\s+/g, '_');
        const timestamp = new Date().toISOString().replace(/:/g, '-').slice(0, 19);

        link.download = `${safeTitle}-StoryLoom-${timestamp}.json`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // AI Tool Handlers
    const handleConsistencyCheck = async (section: OutlineSection) => {
        setIsLoading(true);
        setMessages(prev => [...prev, { role: 'model', text: 'Checking for character consistency in this section...' }]);
        
        const associatedCharacterIds = section.characterIds || [];

        if (associatedCharacterIds.length === 0) {
            setMessages(prev => [...prev, { 
                role: 'model', 
                text: 'No characters are associated with this section. Please associate one or more characters before running a consistency check.' 
            }]);
            setIsLoading(false);
            return;
        }

        try {
            const associatedCharacters = currentProject.characters.filter(char => 
                associatedCharacterIds.includes(char.id)
            );

            const analysis = await aiService.getConsistencyCheckResponse(section, associatedCharacters);
            setMessages(prev => [...prev, { role: 'model', text: analysis }]);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            setMessages(prev => [...prev, { role: 'model', text: `Error: ${errorMessage}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleReadingLevelCheck = async (section: OutlineSection) => {
        setIsLoading(true);
        setMessages(prev => [...prev, { role: 'model', text: `Analyzing reading level for "${section.title}"...` }]);

        if (!section.content.trim()) {
            setMessages(prev => [...prev, { role: 'model', text: "The section is empty. Please add some content to analyze." }]);
            setIsLoading(false);
            return;
        }

        try {
            const analysis = await aiService.getReadingLevel(section.content);
            setMessages(prev => [...prev, { role: 'model', text: analysis }]);
        } catch (error) {
             const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
             setMessages(prev => [...prev, { role: 'model', text: `Error: ${errorMessage}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCleanUpText = async (section: OutlineSection) => {
        setIsLoading(true);
        setMessages(prev => [...prev, { role: 'model', text: `Cleaning up text for "${section.title}"...` }]);

        if (!section.content.trim()) {
            setMessages(prev => [...prev, { role: 'model', text: "The section is empty. Please add some content to clean up." }]);
            setIsLoading(false);
            return;
        }

        try {
            const cleanedText = await aiService.cleanUpText(section.content);
            
            // Save original text to chat for reference/undo
            setMessages(prev => [...prev, { 
                role: 'model', 
                text: `I've updated the text for "${section.title}".\n\n**Here is the original text, just in case:**\n${section.content}` 
            }]);

            // Update the section with cleaned text
            handleUpdateOutlineSection({ sectionId: section.id, newContent: cleanedText });

        } catch (error) {
             const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
             setMessages(prev => [...prev, { role: 'model', text: `Error cleaning up text: ${errorMessage}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateCharacterImage = async (characterId: string) => {
        const character = currentProject.characters.find(c => c.id === characterId);
        if (!character) return;
        
        setIsGeneratingImage(true);
        try {
            const base64Image = await aiService.generateCharacterImage(character);
            handleUpdateCharacter(characterId, { imageUrl: base64Image });
        } catch (error) {
            console.error(error);
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            setMessages(prev => [...prev, { role: 'model', text: `Sorry, I couldn't generate an image for ${character.name}: ${errorMessage}` }]);
        } finally {
            setIsGeneratingImage(false);
        }
    };

    const handleDeleteCharacterImage = async (characterId: string) => {
        const character = currentProject.characters.find(c => c.id === characterId);
        if (character?.imageUrl && character.imageUrl.startsWith('image-')) {
            try {
                await deleteImage(character.imageUrl);
            } catch (error) {
                console.error("Failed to delete character image from DB:", error);
            }
        }
        handleUpdateCharacter(characterId, { imageUrl: undefined });
    };

    const handleGenerateIllustration = async (sectionId: string) => {
        const findSection = (sections: OutlineSection[], id: string): OutlineSection | undefined => {
            for (const section of sections) {
                if (section.id === id) return section;
                if (section.children) {
                    const found = findSection(section.children, id);
                    if (found) return found;
                }
            }
            return undefined;
        };

        const section = findSection(currentProject.outline, sectionId);
        if (!section) return;

        setIsGeneratingIllustration(true);
        try {
            const base64Image = await aiService.generateIllustrationForSection(section, currentProject.genre);
            updateProjectState(prevProject => {
                const newOutline = updateSectionRecursively(prevProject.outline, sectionId, { imageUrl: base64Image });
                return { ...prevProject, outline: newOutline };
            });
        } catch (error) {
            console.error(error);
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            setMessages(prev => [...prev, { role: 'model', text: `Sorry, I couldn't generate an illustration for ${section.title}: ${errorMessage}` }]);
        } finally {
            setIsGeneratingIllustration(false);
        }
    };

    const handleDeleteIllustration = async (sectionId: string) => {
        const findSection = (sections: OutlineSection[], id: string): OutlineSection | undefined => {
            for (const section of sections) {
                if (section.id === id) return section;
                if (section.children) {
                    const found = findSection(section.children, id);
                    if (found) return found;
                }
            }
            return undefined;
        };
        const section = findSection(currentProject.outline, sectionId);

        if (section?.imageUrl && section.imageUrl.startsWith('image-')) {
            try {
                await deleteImage(section.imageUrl);
            } catch (error) {
                console.error("Failed to delete illustration from DB:", error);
            }
        }

        updateProjectState(prevProject => {
            const newOutline = updateSectionRecursively(prevProject.outline, sectionId, { imageUrl: undefined });
            return { ...prevProject, outline: newOutline };
        });
    };

    // Wrapper to handle AI `updateCharacter` tool calls correctly
    const handleAiUpdateCharacter = (args: { characterId: string; [key: string]: any }) => {
        const { characterId, ...updates } = args;
        if (!characterId) {
            console.error("AI tried to update character without providing characterId.");
            return { success: false, message: "Character ID was not provided." };
        }

        const remappedUpdates: Partial<Character> = {};
        for (const key in updates) {
            // Remap keys like "newName" to "name"
            if (key.startsWith('new')) {
                const fieldName = key.charAt(3).toLowerCase() + key.slice(4);
                (remappedUpdates as any)[fieldName] = updates[key];
            }
        }

        return handleUpdateCharacter(characterId, remappedUpdates);
    };

    const personalityPrompts: Record<AiPersonality, string> = {
        assistant: 'You are a helpful and creative writing assistant.',
        muse: 'You are a creative muse, an inspiring and imaginative partner. You speak poetically and offer unconventional ideas, often using metaphors.',
        editor: 'You are a sharp, incisive editor. Your goal is to find weaknesses and offer constructive, direct criticism. You are pragmatic, concise, and avoid fluff or praise.',
        peer: 'You are a supportive fellow writer. You are encouraging, empathetic, and offer suggestions as if you were brainstorming with a friend. Use "we" and "us" to create a collaborative tone.',
        oracle: 'You are The Oracle. You speak in cryptic, thought-provoking phrases. You answer questions with more questions, designed to spark deeper thinking and challenge assumptions. Your goal is not to give answers, but to illuminate the path to them.',
    };

    const toolInstructions = `Your primary function is to help a writer manage their story's structure.
You have been given a set of tools to modify the project's outline and characters.

**CRITICAL INSTRUCTIONS:**
1. When a user's request involves creating, adding, updating, modifying, deleting, moving, or reordering project data (characters or outline sections), you should prioritize using a tool.
2. If the user's intent is clear, execute the function call directly. Do not ask for confirmation.
3. For general conversation, brainstorming, or questions that do not involve direct modification of the project data, you should respond with a helpful text answer.

Use the provided project context and chat history to give insightful and relevant answers.`;


    const handleSendMessage = async (userInput: string, isCouncilMode: boolean = false) => {
        setIsLoading(true);
        const userMessage: ChatMessage = { role: 'user', text: userInput };
        setMessages(prev => [...prev, userMessage]);

        // If in Council Mode, route to the Council method
        if (isCouncilMode) {
            try {
                // Add a placeholder message for the user's visual feedback
                setMessages(prev => [...prev, { role: 'model', text: "The Council is deliberating..." }]);
                
                const councilResponse = await aiService.runCouncil(userInput, currentProject, selectedItem);
                
                // Replace the placeholder or add the new message
                setMessages(prev => {
                    const newMessages = [...prev];
                    // Remove the "deliberating" message if we want to replace it, or just append. 
                    // Let's replace the last message if it was the status update.
                    if (newMessages[newMessages.length - 1].text === "The Council is deliberating...") {
                         newMessages.pop();
                    }
                    return [...newMessages, { role: 'model', text: councilResponse }];
                });
                
                // We don't necessarily update conversationHistory for standard chat when using council mode
                // as it's a one-off deviation, but we could if we wanted continuity.
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
                setMessages(prev => [...prev, { role: 'model', text: `Error: ${errorMessage}` }]);
            } finally {
                setIsLoading(false);
            }
            return;
        }

        // Standard Chat Logic
        let currentHistory: any[] = [...conversationHistory, { role: 'user', content: userInput }];
        setConversationHistory(currentHistory);
        
        const systemInstruction = `${personalityPrompts[aiPersonality]}\n\n${toolInstructions}`;

        try {
            const response = await aiService.getAIResponse(currentHistory, currentProject, selectedItem, systemInstruction);
            
            const toolCalls = response.toolCalls;

            if (toolCalls && toolCalls.length > 0) {
                 const toolFunctions: { [key: string]: (args: any) => any } = {
                    addOutlineSection: handleAddOutlineSection,
                    updateOutlineSection: handleUpdateOutlineSection,
                    deleteOutlineSection: handleDeleteOutlineSection,
                    moveOutlineSection: handleMoveOutlineSection,
                    addCharacter: handleAddCharacter,
                    updateCharacter: handleAiUpdateCharacter, // Use the wrapper
                    deleteCharacter: handleDeleteCharacter,
                };
                
                // Add assistant message with tool calls to history
                const assistantToolCallMessage = {
                    role: 'assistant' as const,
                    tool_calls: toolCalls.map(tc => ({
                        id: tc.id,
                        type: 'function' as const,
                        function: { name: tc.function.name, arguments: tc.function.arguments },
                    })),
                };
                currentHistory.push(assistantToolCallMessage);
                
                // Execute tools and collect their results
                const toolResultMessages = toolCalls.map(toolCall => {
                    const functionName = toolCall.function.name;
                    const functionArgs = JSON.parse(toolCall.function.arguments);
                    let result = { success: false, message: `Unknown function call: ${functionName}` };
                    
                    if (toolFunctions[functionName]) {
                        try {
                           result = toolFunctions[functionName](functionArgs);
                        } catch (e) {
                            console.error(`Error executing tool ${functionName}:`, e);
                            result = { success: false, message: `Error executing tool: ${e instanceof Error ? e.message : String(e)}` };
                        }
                    }

                    return {
                        role: 'tool' as const,
                        tool_call_id: toolCall.id,
                        content: JSON.stringify(result),
                    };
                });
                
                // Add tool results to history and call the AI again
                currentHistory.push(...toolResultMessages);
                setConversationHistory(currentHistory);

                const finalResponse = await aiService.getAIResponse(currentHistory, currentProject, selectedItem, systemInstruction);

                if (finalResponse.text) {
                    const modelMessage: ChatMessage = { role: 'model', text: finalResponse.text };
                    setMessages(prev => [...prev, modelMessage]);
                    setConversationHistory(prev => [...prev, { role: 'assistant', content: finalResponse.text }]);
                } else {
                    const modelMessage: ChatMessage = { role: 'model', text: "(Actions performed successfully.)" };
                    setMessages(prev => [...prev, modelMessage]);
                    setConversationHistory(prev => [...prev, { role: 'assistant', content: null }]);
                }


            } else if (response.text) {
                const modelMessage: ChatMessage = { role: 'model', text: response.text };
                setMessages(prev => [...prev, modelMessage]);
                setConversationHistory(prev => [...prev, { role: 'assistant', content: response.text }]);
            } else {
                 const emptyResponseMessage: ChatMessage = { role: 'model', text: "(No text response from AI)" };
                 setMessages(prev => [...prev, emptyResponseMessage]);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            const modelMessage: ChatMessage = { role: 'model', text: `Sorry, there was an error: ${errorMessage}` };
            setMessages(prev => [...prev, modelMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleTriggerAdvisor = (advisorName: string) => {
        if (isChatSidebarCollapsed) {
            setIsChatSidebarCollapsed(false);
        }
        
        const prompt = `Please analyze my project outline using the "${advisorName}" storytelling framework.
        
        Review the current outline sections and headings.
        1. Briefly summarize the core philosophy of ${advisorName}.
        2. Map my current outline to the stages of this framework.
        3. Identify where the story deviates or is missing key structural beats.
        4. Suggest concrete ways to adapt the current outline to fit this pattern effectively.`;

        handleSendMessage(prompt);
    };

  return (
    <div className="flex h-screen w-full overflow-hidden">
        <ConfirmModal
            isOpen={!!characterToDelete}
            onClose={() => setCharacterToDelete(null)}
            onConfirm={() => {
                if (characterToDelete) {
                    handleDeleteCharacter({ characterId: characterToDelete.id });
                    setCharacterToDelete(null);
                }
            }}
            title="Confirm Character Deletion"
            confirmButtonText="Delete Character"
        >
            <p>
                Are you sure you want to permanently delete the character <strong className="font-semibold text-white">"{characterToDelete?.name || ''}"</strong>? This will also remove them from any associated outline sections. This action cannot be undone.
            </p>
        </ConfirmModal>

         <ConfirmModal
            isOpen={!!noteToDelete}
            onClose={() => setNoteToDelete(null)}
            onConfirm={() => {
                if (noteToDelete) {
                    handleDeleteNote(noteToDelete.id);
                    setNoteToDelete(null);
                }
            }}
            title="Confirm Note Deletion"
            confirmButtonText="Delete Note"
        >
            <p>
                Are you sure you want to permanently delete the note <strong className="font-semibold text-white">"{noteToDelete?.title || ''}"</strong>? This action cannot be undone.
            </p>
        </ConfirmModal>

        <ConfirmModal
            isOpen={!!taskListToDelete}
            onClose={() => setTaskListToDelete(null)}
            onConfirm={() => {
                if (taskListToDelete) {
                    handleDeleteTaskList(taskListToDelete.id);
                    setTaskListToDelete(null);
                }
            }}
            title="Confirm List Deletion"
            confirmButtonText="Delete List"
        >
            <p>
                Are you sure you want to permanently delete the list <strong className="font-semibold text-white">"{taskListToDelete?.title || ''}"</strong>? This action cannot be undone.
            </p>
        </ConfirmModal>

        <LeftSidebar 
            project={currentProject}
            activeTab={activeTab}
            setActiveTab={handleSetTab}
            selectedItem={selectedItem}
            onSelectItem={handleSelectItem}
            onBack={onBack}
            onUpdateOutlineTitle={handleUpdateOutlineTitle}
            onToggleOutlineExport={handleToggleOutlineExport}
            onAddSubItem={(parentId) => handleAddOutlineSection({ parentId, title: "New Section"})}
            onAddRootItem={() => handleAddOutlineSection({ title: "New Section"})}
            onDeleteOutlineSection={(sectionId) => handleDeleteOutlineSection({ sectionId })}
            onReorderOutline={(draggedId, targetId, position) => {
                if (position === 'on') {
                    handleMoveOutlineSection({ sectionId: draggedId, targetParentId: targetId });
                } else {
                    handleMoveOutlineSection({ sectionId: draggedId, targetSiblingId: targetId, position: position === 'above' ? 'before' : 'after' });
                }
            }}
            onAddCharacter={handleAddManualCharacter}
            onImportCharacter={handleImportCharacter}
            onAddNote={handleAddNote}
            onDeleteNoteRequest={(note) => setNoteToDelete(note)}
            onAddTaskList={handleAddTaskList}
            onDeleteTaskListRequest={(list) => setTaskListToDelete(list)}
            saveStatus={saveStatus}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={toggleSidebar}
            onUndo={undo}
            onRedo={redo}
            canUndo={history.past.length > 0}
            canRedo={history.future.length > 0}
            onTriggerAdvisor={handleTriggerAdvisor}
            width={leftSidebarWidth}
            isResizing={isResizingLeft}
            onExport={handleExportProject}
        />

        {!isSidebarCollapsed && (
            <div
                className={`w-1 cursor-col-resize hover:bg-cyan-500 transition-colors z-20 flex-shrink-0 ${isResizingLeft ? 'bg-cyan-500' : 'bg-gray-900 border-r border-gray-700'}`}
                onMouseDown={(e) => { e.preventDefault(); setIsResizingLeft(true); }}
            />
        )}

        <MainContent 
            item={selectedItem}
            project={currentProject}
            activeTab={activeTab}
            onUpdateOutlineContent={(sectionId, newContent) => handleUpdateOutlineSection({ sectionId, newContent })}
            onUpdateCharacter={handleUpdateCharacter}
            onDeleteCharacterRequest={(character) => setCharacterToDelete(character)}
            onUpdateNote={handleUpdateNote}
            onDeleteNoteRequest={(note) => setNoteToDelete(note)}
            onUpdateTaskList={handleUpdateTaskList}
            onDeleteTaskListRequest={(list) => setTaskListToDelete(list)}
            onToggleCharacterAssociation={(sectionId, characterId) => {
                updateProjectState(prevProject => ({
                    ...prevProject,
                    outline: toggleCharacterAssociationRecursively(prevProject.outline, sectionId, characterId)
                }));
            }}
            onConsistencyCheck={handleConsistencyCheck}
            onReadingLevelCheck={handleReadingLevelCheck}
            onCleanUpText={handleCleanUpText}
            onGenerateCharacterImage={handleGenerateCharacterImage}
            onDeleteCharacterImage={handleDeleteCharacterImage}
            isGeneratingImage={isGeneratingImage}
            onGenerateIllustration={handleGenerateIllustration}
            onDeleteIllustration={handleDeleteIllustration}
            isGeneratingIllustration={isGeneratingIllustration}
            onNodeClick={handleSelectItem}
            aiService={aiService}
        />

        {!isChatSidebarCollapsed && (
            <div
                className={`w-1 cursor-col-resize hover:bg-cyan-500 transition-colors z-20 flex-shrink-0 ${isResizingChat ? 'bg-cyan-500' : 'bg-gray-900 border-l border-gray-700'}`}
                onMouseDown={(e) => { e.preventDefault(); setIsResizingChat(true); }}
            />
        )}

        <ChatSidebar 
            project={currentProject}
            messages={messages}
            isLoading={isLoading}
            onSendMessage={handleSendMessage}
            isCollapsed={isChatSidebarCollapsed}
            onToggleCollapse={toggleChatSidebar}
            aiPersonality={aiPersonality}
            onAiPersonalityChange={setAiPersonality}
            width={chatSidebarWidth}
            isResizing={isResizingChat}
            onSaveChatToNote={() => handleSaveChatToNote(messages)}
        />
    </div>
  );
};

export default WritingWorkspace;
