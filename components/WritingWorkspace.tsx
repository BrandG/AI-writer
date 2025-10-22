import React, { useState, useCallback, useEffect } from 'react';
import { Project, SelectableItem, OutlineSection, Character, ChatMessage } from '../types';
import LeftSidebar from './LeftSidebar';
import MainContent from './MainContent';
import ChatSidebar from './ChatSidebar';
import { v4 as uuidv4 } from 'uuid';
import { getGeminiResponse, getConsistencyCheckResponse, generateCharacterImage } from '../services/geminiService';


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
}

const WritingWorkspace: React.FC<WritingWorkspaceProps> = ({ project, onBack }) => {
  const [currentProject, setCurrentProject] = useState<Project>(project);
  const [activeTab, setActiveTab] = useState<'outline' | 'characters'>('outline');
  const [selectedItem, setSelectedItem] = useState<SelectableItem | null>(currentProject.outline[0] || null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // State to hold the full conversation history for the API
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);


  // If the project prop changes (e.g., user goes back and selects a new one), reset state
  useEffect(() => {
    setCurrentProject(project);
    const initialSelectedItem = project.outline[0] || project.characters[0] || null;
    setSelectedItem(initialSelectedItem);
    setActiveTab('outline');
    const initialMessage = { role: 'model' as const, text: `Hello! How can I help you with '${project.title}' today?` };
    setMessages([initialMessage]);
    // Also reset the API conversation history
    setConversationHistory([{ role: 'model', parts: [{ text: initialMessage.text }] }]);
    setIsLoading(false);
  }, [project]);

  const handleSelectItem = useCallback((item: SelectableItem) => {
    setSelectedItem(item);
  }, []);
  
  const handleUpdateOutlineTitle = (sectionId: string, newTitle: string) => {
    setCurrentProject(prevProject => {
        const newOutline = updateTitleRecursively(prevProject.outline, sectionId, newTitle);
        const updatedProject = { ...prevProject, outline: newOutline };

        if (selectedItem?.id === sectionId && selectedItem.type === 'outline') {
            setSelectedItem({ ...selectedItem, title: newTitle });
        }
        
        return updatedProject;
    });
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
            const updatedProject = { ...prevProject, outline: newOutline };

            if (selectedItem?.id === sectionId && selectedItem.type === 'outline') {
                setSelectedItem(prev => ({ ...prev!, ...updates }));
            }
            return updatedProject;
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


  const handleAddSubItem = (parentId: string) => {
    // This is now just for manual user clicks
    handleAddOutlineSection({ parentId, title: 'New Section' });
  };

  const handleAddRootItem = () => {
    // This is now just for manual user clicks
    handleAddOutlineSection({ title: 'New Root Section' });
  };

  const handleUpdateOutlineContent = (sectionId: string, newContent: string) => {
    handleUpdateOutlineSection({ sectionId, newContent });
  };

  const handleUpdateCharacter = (characterId: string, updatedData: Partial<Character>) => {
    setCurrentProject(prevProject => {
        const newCharacters = prevProject.characters.map(char =>
            char.id === characterId ? { ...char, ...updatedData } : char
        );
        const updatedProject = { ...prevProject, characters: newCharacters };

        if (selectedItem?.id === characterId && selectedItem.type === 'character') {
            setSelectedItem({ ...selectedItem, ...updatedData });
        }

        return updatedProject;
    });
  };

  const handleToggleCharacterAssociation = (sectionId: string, characterId: string) => {
     setCurrentProject(prevProject => {
        const newOutline = toggleCharacterAssociationRecursively(prevProject.outline, sectionId, characterId);
        const updatedProject = { ...prevProject, outline: newOutline };
        
        if (selectedItem?.id === sectionId && selectedItem.type === 'outline') {
            const currentIds = selectedItem.characterIds || [];
            const newIds = currentIds.includes(characterId)
                ? currentIds.filter(id => id !== characterId)
                : [...currentIds, characterId];
            setSelectedItem({ ...selectedItem, characterIds: newIds });
        }

        return updatedProject;
    });
  };

  const handleReorderOutline = useCallback((draggedId: string, targetId: string, position: 'above' | 'below' | 'on') => {
        setCurrentProject(prevProject => {
            const outline = JSON.parse(JSON.stringify(prevProject.outline));
            let draggedItem: OutlineSection | null = null;
            
            // Helper to prevent dropping a parent into its own child
            const isDescendant = (node: OutlineSection, parentId: string): boolean => {
                if (node.id === parentId) return true;
                if (node.children) {
                    return node.children.some(child => isDescendant(child, parentId));
                }
                return false;
            };

            // Find and remove the dragged item
            const findAndRemove = (sections: OutlineSection[], id: string): OutlineSection[] => {
                return sections.filter(section => {
                    if (section.id === id) {
                        draggedItem = section;
                        return false;
                    }
                    if (section.children) {
                        section.children = findAndRemove(section.children, id);
                    }
                    return true;
                });
            };

            const newOutlineWithoutDragged = findAndRemove(outline, draggedId);
            if (!draggedItem) return prevProject;

            // Prevent invalid drop
            if (isDescendant(draggedItem, targetId)) {
                console.warn("Cannot drop a parent item into one of its children.");
                return prevProject;
            }

            // Find the target and insert the dragged item
            const findAndInsert = (sections: OutlineSection[], tId: string, item: OutlineSection, pos: string): OutlineSection[] => {
                if (pos === 'on') {
                    return sections.map(section => {
                        if (section.id === tId) {
                            section.children = [...(section.children || []), item];
                        } else if (section.children) {
                            section.children = findAndInsert(section.children, tId, item, pos);
                        }
                        return section;
                    });
                }
                
                const targetIndex = sections.findIndex(s => s.id === tId);
                if (targetIndex > -1) {
                    if (pos === 'above') {
                        sections.splice(targetIndex, 0, item);
                    } else { // below
                        sections.splice(targetIndex + 1, 0, item);
                    }
                    return sections;
                }

                return sections.map(section => {
                    if (section.children) {
                        section.children = findAndInsert(section.children, tId, item, pos);
                    }
                    return section;
                });
            };
            
            const newOutline = findAndInsert(newOutlineWithoutDragged, targetId, draggedItem, position);

            return { ...prevProject, outline: newOutline };
        });
    }, []);

    const handleSendMessage = async (userInput: string) => {
        if (!userInput.trim() || isLoading) return;
    
        const userMessage: ChatMessage = { role: 'user', text: userInput };
        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);

        const userTurn = { role: 'user', parts: [{ text: userInput }] };
        const currentHistory = [...conversationHistory, userTurn];
    
        try {
            const response = await getGeminiResponse(currentHistory, currentProject, selectedItem);
            
            if (response.functionCalls && response.functionCalls.length > 0) {
                // The model wants to call a function.
                
                // Get the model's turn (the function call request).
                const modelTurn = { role: 'model', parts: response.candidates[0].content.parts };
                
                // Execute the functions and collect the results into parts.
                const toolParts = response.functionCalls.map(call => {
                    let result: any;
                    try {
                        switch (call.name) {
                            case 'addOutlineSection':
                                handleAddOutlineSection(call.args);
                                result = { success: true };
                                break;
                            case 'updateOutlineSection':
                                handleUpdateOutlineSection(call.args);
                                result = { success: true };
                                break;
                            case 'deleteOutlineSection':
                                handleDeleteOutlineSection(call.args);
                                result = { success: true };
                                break;
                            default:
                                result = { success: false, error: `Function ${call.name} not found.` };
                        }
                    } catch (e) {
                         result = { success: false, error: (e as Error).message };
                    }
                    // Format the response for the API.
                    return {
                        functionResponse: {
                            name: call.name,
                            response: result
                        }
                    };
                });
                
                // Create the tool's turn containing the results of the function calls.
                const toolTurn = { role: 'tool', parts: toolParts };
                const historyWithToolResponse = [...currentHistory, modelTurn, toolTurn];

                // Send the tool response back to the model for a final text response.
                const finalResponse = await getGeminiResponse(historyWithToolResponse, currentProject, selectedItem);
                
                const modelMessage: ChatMessage = { role: 'model', text: finalResponse.text };
                setMessages(prev => [...prev, modelMessage]);
                setConversationHistory([...historyWithToolResponse, { role: 'model', parts: [{ text: finalResponse.text }] }]);

            } else {
                // Simple text response
                const modelMessage: ChatMessage = { role: 'model', text: response.text };
                setMessages(prev => [...prev, modelMessage]);
                setConversationHistory([...currentHistory, { role: 'model', parts: [{ text: response.text }] }]);
            }

        } catch (error) {
          console.error("Failed to get chat response:", error);
          const errorMessageText = error instanceof Error ? error.message : "Sorry, I'm having trouble connecting right now.";
          const errorMessage: ChatMessage = { role: 'model', text: errorMessageText };
          setMessages(prev => [...prev, errorMessage]);
        } finally {
          setIsLoading(false);
        }
    };

    const handleConsistencyCheck = async (section: OutlineSection) => {
        if (isLoading) return;

        const associatedCharacters = currentProject.characters.filter(
            c => section.characterIds?.includes(c.id)
        );

        if (associatedCharacters.length === 0) {
            const noCharsMessage: ChatMessage = { role: 'model', text: "There are no characters associated with this section to check for consistency. Please link some characters first." };
            setMessages(prev => [...prev, noCharsMessage]);
            return;
        }

        const systemMessage: ChatMessage = { role: 'user', text: `[Running character consistency check on "${section.title}"]` };
        setMessages(prev => [...prev, systemMessage]);
        setIsLoading(true);

        try {
            const responseText = await getConsistencyCheckResponse(section, associatedCharacters);
            const modelMessage: ChatMessage = { role: 'model', text: responseText };
            setMessages(prev => [...prev, modelMessage]);
        } catch (error) {
            console.error("Failed to get consistency response:", error);
            const errorMessage: ChatMessage = { role: 'model', text: "Sorry, I'm having trouble with the consistency check right now." };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateCharacterImage = async (characterId: string) => {
        if (isGeneratingImage) return;

        const character = currentProject.characters.find(c => c.id === characterId);
        if (!character) {
            console.error("Character not found");
            return;
        }

        setIsGeneratingImage(true);
        const systemMessage: ChatMessage = { role: 'user', text: `[Generating image for ${character.name}...]` };
        setMessages(prev => [...prev, systemMessage]);

        try {
            const base64Image = await generateCharacterImage(character);
            handleUpdateCharacter(characterId, { imageUrl: base64Image });
            const successMessage: ChatMessage = { role: 'model', text: `Successfully generated a new image for ${character.name}!` };
            setMessages(prev => [...prev, successMessage]);
        } catch (error) {
            console.error("Failed to generate character image:", error);
            const errorMessage: ChatMessage = { role: 'model', text: error instanceof Error ? error.message : "An unknown error occurred during image generation." };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsGeneratingImage(false);
        }
    };


  return (
    <div className="flex h-screen bg-gray-900 text-gray-200">
        <LeftSidebar 
            project={currentProject}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            selectedItem={selectedItem}
            onSelectItem={handleSelectItem}
            onBack={onBack}
            onUpdateOutlineTitle={handleUpdateOutlineTitle}
            onAddSubItem={handleAddSubItem}
            onAddRootItem={handleAddRootItem}
            onReorderOutline={handleReorderOutline}
        />
        <MainContent 
          item={selectedItem} 
          project={currentProject}
          onUpdateOutlineContent={handleUpdateOutlineContent}
          onUpdateCharacter={handleUpdateCharacter}
          onToggleCharacterAssociation={handleToggleCharacterAssociation}
          onConsistencyCheck={handleConsistencyCheck}
          onGenerateCharacterImage={handleGenerateCharacterImage}
          isGeneratingImage={isGeneratingImage}
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