

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Project, SelectableItem, OutlineSection, Character, ChatMessage, AiService } from '../types';
import LeftSidebar from './LeftSidebar';
import MainContent from './MainContent';
import ChatSidebar from './ChatSidebar';
import { v4 as uuidv4 } from 'uuid';


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


// Recursive helper to delete a section
const deleteSectionRecursively = (sections: OutlineSection[], sectionId: string): OutlineSection[] => {
    return sections.filter(section => {
        if (section.id === sectionId) {
            return false;
        }
        if (section.children) {
            section.children = deleteSectionRecursively(section.children, sectionId);
        }
        return true;
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

interface WritingWorkspaceProps {
  project: Project;
  onBack: () => void;
  onUpdateProject: (updatedProject: Project) => Promise<void>;
  aiService: AiService;
}

export type SaveStatus = 'unsaved' | 'saving' | 'saved' | 'error';
export type ActiveTab = 'outline' | 'characters' | 'notes';


// FIX: The component was not returning any JSX, causing a type error with React.FC.
const WritingWorkspace: React.FC<WritingWorkspaceProps> = ({ project, onBack, onUpdateProject, aiService }) => {
  const [currentProject, setCurrentProject] = useState<Project>(project);
  const [activeTab, setActiveTab] = useState<ActiveTab>('outline');
  const [selectedItem, setSelectedItem] = useState<SelectableItem | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // State to hold the full conversation history for the API
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingIllustration, setIsGeneratingIllustration] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  
  // Track the current project ID to differentiate between a project switch and a data update.
  const [currentProjectId, setCurrentProjectId] = useState<string>(project.id);

  const debounceTimeoutRef = useRef<number | null>(null);

  // Debounced save effect
  useEffect(() => {
    // This effect is triggered whenever currentProject changes.
    // It replaces the old, immediate useEffect.

    // Don't save if the project is the same as the initial prop (initial load)
    if (currentProject === project) {
        return;
    }
    
    setSaveStatus('unsaved');

    // Clear any existing timer
    if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
    }

    // Set a new timer
    debounceTimeoutRef.current = window.setTimeout(async () => {
        setSaveStatus('saving');
        try {
            await onUpdateProject(currentProject);
            setSaveStatus('saved');
        } catch (error) {
            console.error("Debounced save failed:", error);
            setSaveStatus('error');
        }
    }, 1500); // Wait 1.5 seconds after the last change to save

    // Cleanup function to clear the timer if the component unmounts
    return () => {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
    };
  }, [currentProject, onUpdateProject, project]);



  // This effect handles both switching projects and syncing updates from the parent.
  useEffect(() => {
    // A true project switch (different ID) triggers a full state reset.
    if (project.id !== currentProjectId) {
      setCurrentProjectId(project.id); // Track the new ID
      setCurrentProject(project);
      const initialSelectedItem = project.outline[0] || project.characters[0] || null;
      setSelectedItem(initialSelectedItem);
      setActiveTab(initialSelectedItem?.type === 'character' ? 'characters' : 'outline');
      const initialMessage = { role: 'model' as const, text: `Hello! How can I help you with '${project.title}' today?` };
      setMessages([initialMessage]);
      setConversationHistory([{ role: 'assistant', content: initialMessage.text }]);
      setIsLoading(false);
      setSaveStatus('saved');
    } else {
      // This is just a data sync from the parent after a save.
      // We update the local project state to match the parent, but preserve UI state
      // like the active tab and selected item. This prevents resetting the view on every auto-save.
      setCurrentProject(project);
    }
  }, [project, currentProjectId]);

  const handleSelectItem = useCallback((item: SelectableItem) => {
    setSelectedItem(item);
  }, []);
  
  // FIX: Use a functional update for setSelectedItem to avoid stale state bugs.
  // This ensures the update is based on the most recent state.
  const handleUpdateOutlineTitle = (sectionId: string, newTitle: string) => {
    setCurrentProject(prevProject => {
        const newOutline = updateTitleRecursively(prevProject.outline, sectionId, newTitle);
        const updatedProject = { ...prevProject, outline: newOutline };
        
        return updatedProject;
    });
     if (selectedItem?.id === sectionId && selectedItem.type === 'outline') {
        setSelectedItem(prev => {
            if (prev?.type === 'outline' && prev.id === sectionId) {
                return { ...prev, title: newTitle };
            }
            return prev;
        });
    }
  };

    const handleAddOutlineSection = (args: { parentId?: string; title: string; content?: string }) => {
        const { parentId, title, content } = args;
        const newSection: OutlineSection = {
            id: uuidv4(),
            title: title,
            content: content || '',
            type: 'outline',
            children: [],
        };

        setCurrentProject(prevProject => {
            let newOutline;
            if (parentId) {
                newOutline = addSubItemRecursively(prevProject.outline, parentId, newSection);
            } else {
                newOutline = [...prevProject.outline, newSection];
            }
            return { ...prevProject, outline: newOutline };
        });
    };

    const handleUpdateOutlineSection = (args: { sectionId: string; newTitle?: string; newContent?: string }) => {
        const { sectionId, newTitle, newContent } = args;
        const updates: Partial<OutlineSection> = {};
        if (newTitle) updates.title = newTitle;
        if (newContent) updates.content = newContent;

        setCurrentProject(prevProject => {
            const newOutline = updateSectionRecursively(prevProject.outline, sectionId, updates);
            return { ...prevProject, outline: newOutline };
        });

        setSelectedItem(prev => {
            if (prev?.id === sectionId && prev.type === 'outline') {
                return { ...prev, ...updates };
            }
            return prev;
        });
    };

    const handleDeleteOutlineSection = (args: { sectionId: string }) => {
        const { sectionId } = args;
        setCurrentProject(prevProject => {
            const newOutline = deleteSectionRecursively(prevProject.outline, sectionId);
            const updatedProject = { ...prevProject, outline: newOutline };

            // If the deleted item was selected, deselect it
            if (selectedItem?.id === sectionId) {
                setSelectedItem(null);
            }
            return updatedProject;
        });
    };

    const handleMoveOutlineSection = (args: {
        sectionId: string;
        targetParentId?: string;
        targetSiblingId?: string;
        position?: 'before' | 'after';
    }) => {
        const { sectionId, targetParentId, targetSiblingId, position } = args;

        setCurrentProject(prevProject => {
            const outline = JSON.parse(JSON.stringify(prevProject.outline));
            let movedItem: OutlineSection | null = null;
            
            const isDescendant = (node: OutlineSection, parentId: string): boolean => {
                if (node.id === parentId) return true;
                if (node.children) {
                    return node.children.some(child => isDescendant(child, parentId));
                }
                return false;
            };

            const findAndRemove = (sections: OutlineSection[], id: string): OutlineSection[] => {
                return sections.filter(section => {
                    if (section.id === id) {
                        movedItem = section;
                        return false;
                    }
                    if (section.children) {
                        section.children = findAndRemove(section.children, id);
                    }
                    return true;
                });
            };

            const outlineWithoutMoved = findAndRemove(outline, sectionId);
            if (!movedItem) {
                console.error("Item to move not found:", sectionId);
                return prevProject;
            }

            // Prevent dropping a parent into its own child.
            if (targetParentId && isDescendant(movedItem, targetParentId)) {
                console.warn("Cannot move a parent section into one of its own children.");
                return prevProject;
            }
            if (targetSiblingId && isDescendant(movedItem, targetSiblingId)) {
                console.warn("Cannot move a parent section into one of its own children.");
                return prevProject;
            }

            let newOutline = outlineWithoutMoved;
            let inserted = false;

            if (targetSiblingId && position) {
                const findAndInsertBySibling = (sections: OutlineSection[]): OutlineSection[] => {
                    if (inserted) return sections;

                    const targetIndex = sections.findIndex(s => s.id === targetSiblingId);
                    if (targetIndex > -1) {
                        const insertIndex = position === 'before' ? targetIndex : targetIndex + 1;
                        sections.splice(insertIndex, 0, movedItem!);
                        inserted = true;
                        return sections;
                    }

                    return sections.map(section => {
                        if (section.children && !inserted) {
                            section.children = findAndInsertBySibling(section.children);
                        }
                        return section;
                    });
                };
                newOutline = findAndInsertBySibling(newOutline);
            } else if (targetParentId) {
                const findAndInsertInParent = (sections: OutlineSection[]): OutlineSection[] => {
                    if (inserted) return sections;
                    // FIX: The .map function must always return a value. Added `return section` to all paths.
                    return sections.map(section => {
                        if (section.id === targetParentId) {
                            section.children = [...(section.children || []), movedItem!];
                            inserted = true;
                        } else if (section.children && !inserted) {
                            // FIX: Corrected recursive call from non-existent 'findAndInsert' to 'findAndInsertInParent'.
                            section.children = findAndInsertInParent(section.children);
                        }
                        return section;
                    });
                };
                newOutline = findAndInsertInParent(newOutline);
            }

            if (!inserted) {
                // If it wasn't inserted as a child or sibling, it becomes a root item.
                newOutline.push(movedItem!);
            }
            
            return { ...prevProject, outline: newOutline };
        });
    };
    
    // Character Handlers (used by AI tools and MainContent)
    const handleAddCharacter = (args: Omit<Character, 'id' | 'type'>) => {
        const newCharacter: Character = {
            ...args,
            id: uuidv4(),
            type: 'character',
        };
        setCurrentProject(prevProject => ({
            ...prevProject,
            characters: [...prevProject.characters, newCharacter],
        }));
    };

    const handleUpdateCharacter = (characterId: string, updatedData: Partial<Character>) => {
        setCurrentProject(prevProject => {
            const newCharacters = prevProject.characters.map(char =>
                char.id === characterId ? { ...char, ...updatedData } : char
            );
            return { ...prevProject, characters: newCharacters };
        });
        
        setSelectedItem(prev => {
            if (prev?.id === characterId && prev.type === 'character') {
                return { ...prev, ...updatedData };
            }
            return prev;
        });
    };
    
    const handleDeleteCharacter = (args: { characterId: string }) => {
        setCurrentProject(prevProject => {
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
            
            if (selectedItem?.id === args.characterId) {
                setSelectedItem(null);
            }
            return updatedProject;
        });
    };

    const handleUpdateNotes = (newNotes: string) => {
        setCurrentProject(prev => ({ ...prev, notes: newNotes }));
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
            setCurrentProject(prevProject => {
                const newOutline = updateSectionRecursively(prevProject.outline, sectionId, { imageUrl: base64Image });
                return { ...prevProject, outline: newOutline };
            });
            setSelectedItem(prev => {
                if (prev?.id === sectionId && prev.type === 'outline') {
                    return { ...prev, imageUrl: base64Image };
                }
                return prev;
            });
        } catch (error) {
            console.error(error);
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            setMessages(prev => [...prev, { role: 'model', text: `Sorry, I couldn't generate an illustration for ${section.title}: ${errorMessage}` }]);
        } finally {
            setIsGeneratingIllustration(false);
        }
    };

    // Wrapper to handle AI `updateCharacter` tool calls correctly
    const handleAiUpdateCharacter = (args: { characterId: string; [key: string]: any }) => {
        const { characterId, ...updates } = args;
        if (!characterId) {
            console.error("AI tried to update character without providing characterId.");
            return;
        }

        const remappedUpdates: Partial<Character> = {};
        for (const key in updates) {
            // Remap keys like "newName" to "name"
            if (key.startsWith('new')) {
                const fieldName = key.charAt(3).toLowerCase() + key.slice(4);
                (remappedUpdates as any)[fieldName] = updates[key];
            }
        }

        handleUpdateCharacter(characterId, remappedUpdates);
    };

    const handleSendMessage = async (userInput: string) => {
        setIsLoading(true);
        const userMessage: ChatMessage = { role: 'user', text: userInput };
        setMessages(prev => [...prev, userMessage]);

        const newConversationHistory = [...conversationHistory, { role: 'user', content: userInput }];
        setConversationHistory(newConversationHistory);
        
        try {
            const response = await aiService.getAIResponse(newConversationHistory, currentProject, selectedItem);
            
            const toolCalls = response.toolCalls;

            if (toolCalls && toolCalls.length > 0) {
                let toolMessages: string[] = [];
                 const toolFunctions: { [key: string]: (args: any) => void } = {
                    addOutlineSection: handleAddOutlineSection,
                    updateOutlineSection: handleUpdateOutlineSection,
                    deleteOutlineSection: handleDeleteOutlineSection,
                    moveOutlineSection: handleMoveOutlineSection,
                    addCharacter: handleAddCharacter,
                    updateCharacter: handleAiUpdateCharacter, // Use the wrapper
                    deleteCharacter: handleDeleteCharacter,
                };

                // Add assistant message with tool calls to history
                // The exact format for OpenAI history needs to match what the API expects for follow-up calls.
                const historyToolCalls = toolCalls.map(tc => ({
                    id: tc.id,
                    type: 'function' as const,
                    function: {
                        name: tc.function.name,
                        arguments: tc.function.arguments,
                    }
                }));

                setConversationHistory(prev => [...prev, { role: 'assistant', tool_calls: historyToolCalls }]);
                
                for (const toolCall of toolCalls) {
                    const functionName = toolCall.function.name;
                    const functionArgs = JSON.parse(toolCall.function.arguments);

                    if (toolFunctions[functionName]) {
                        toolFunctions[functionName](functionArgs);
                        toolMessages.push(`Executed: ${functionName}`);
                    } else {
                        console.warn(`Unknown function call: ${functionName}`);
                        toolMessages.push(`Error: AI tried to use an unknown tool '${functionName}'.`);
                    }
                }
                
                const toolResponseMessage: ChatMessage = { role: 'model', text: `(Action taken: ${toolMessages.join(', ')})` };
                setMessages(prev => [...prev, toolResponseMessage]);

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

  return (
    <div className="flex h-screen w-full">
        <LeftSidebar 
            project={currentProject}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            selectedItem={selectedItem}
            onSelectItem={handleSelectItem}
            onBack={onBack}
            onUpdateOutlineTitle={handleUpdateOutlineTitle}
            onAddSubItem={(parentId) => handleAddOutlineSection({ parentId, title: "New Section"})}
            onAddRootItem={() => handleAddOutlineSection({ title: "New Section"})}
            onReorderOutline={(draggedId, targetId, position) => {
                if (position === 'on') {
                    handleMoveOutlineSection({ sectionId: draggedId, targetParentId: targetId });
                } else {
                    handleMoveOutlineSection({ sectionId: draggedId, targetSiblingId: targetId, position: position === 'above' ? 'before' : 'after' });
                }
            }}
            saveStatus={saveStatus}
        />
        <MainContent 
            item={selectedItem}
            project={currentProject}
            activeTab={activeTab}
            onUpdateOutlineContent={(sectionId, newContent) => handleUpdateOutlineSection({ sectionId, newContent })}
            onUpdateCharacter={handleUpdateCharacter}
            onUpdateNotes={handleUpdateNotes}
            onToggleCharacterAssociation={(sectionId, characterId) => {
                setCurrentProject(prevProject => ({
                    ...prevProject,
                    outline: toggleCharacterAssociationRecursively(prevProject.outline, sectionId, characterId)
                }));
                setSelectedItem(prevSelectedItem => {
                    if (prevSelectedItem?.id === sectionId && prevSelectedItem.type === 'outline') {
                        const currentIds = prevSelectedItem.characterIds || [];
                        const newIds = currentIds.includes(characterId)
                            ? currentIds.filter(id => id !== characterId)
                            : [...currentIds, characterId];
                        return { ...prevSelectedItem, characterIds: newIds };
                    }
                    return prevSelectedItem;
                });
            }}
            onConsistencyCheck={handleConsistencyCheck}
            onGenerateCharacterImage={handleGenerateCharacterImage}
            isGeneratingImage={isGeneratingImage}
            onGenerateIllustration={handleGenerateIllustration}
            isGeneratingIllustration={isGeneratingIllustration}
        />
        <ChatSidebar 
            project={currentProject}
            messages={messages}
            isLoading={isLoading}
            onSendMessage={handleSendMessage}
        />
    </div>
  );
};

export default WritingWorkspace;