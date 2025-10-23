import { GoogleGenAI, Modality, FunctionDeclaration, Type, GenerateContentResponse } from "@google/genai";
import { Project, ChatMessage, SelectableItem, OutlineSection, Character } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Define the tools (functions) the AI can call
const addOutlineSectionTool: FunctionDeclaration = {
    name: 'addOutlineSection',
    description: 'Adds a new section to the project outline. Can be a root section or a sub-section of an existing one.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING, description: 'The title of the new section.' },
            content: { type: Type.STRING, description: 'Optional content for the new section.' },
            parentId: { type: Type.STRING, description: 'Optional ID of the parent section. If omitted, the section is added to the root.' },
        },
        required: ['title'],
    },
};

const updateOutlineSectionTool: FunctionDeclaration = {
    name: 'updateOutlineSection',
    description: 'Updates an existing section in the project outline. Can update the title, content, or both.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            sectionId: { type: Type.STRING, description: 'The ID of the section to update.' },
            newTitle: { type: Type.STRING, description: 'The new title for the section.' },
            newContent: { type: Type.STRING, description: 'The new content for the section.' },
        },
        required: ['sectionId'],
    },
};

const deleteOutlineSectionTool: FunctionDeclaration = {
    name: 'deleteOutlineSection',
    description: 'Deletes an existing section from the project outline.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            sectionId: { type: Type.STRING, description: 'The ID of the section to delete.' },
        },
        required: ['sectionId'],
    },
};

const moveOutlineSectionTool: FunctionDeclaration = {
    name: 'moveOutlineSection',
    description: 'Moves an existing section to a new position in the outline. Can be used to reorder sections or change their nesting level.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            sectionId: { type: Type.STRING, description: 'The ID of the section to move.' },
            targetParentId: { type: Type.STRING, description: 'Optional. The ID of the new parent section. If omitted and no sibling is specified, the section becomes a root item.' },
            targetSiblingId: { type: Type.STRING, description: 'Optional. The ID of an existing section to place the moved section next to.' },
            position: { type: Type.STRING, description: "Required if 'targetSiblingId' is provided. Can be 'before' or 'after'." },
        },
        required: ['sectionId'],
    },
};

const addCharacterTool: FunctionDeclaration = {
    name: 'addCharacter',
    description: 'Adds a new character to the project.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING, description: 'The name of the new character.' },
            description: { type: Type.STRING, description: 'A detailed description of the character.' },
            backstory: { type: Type.STRING, description: 'The backstory of the character.' },
            relationships: { type: Type.STRING, description: "The character's relationships with others." },
        },
        required: ['name', 'description', 'backstory', 'relationships'],
    },
};

const updateCharacterTool: FunctionDeclaration = {
    name: 'updateCharacter',
    description: 'Updates an existing character in the project.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            characterId: { type: Type.STRING, description: 'The ID of the character to update.' },
            newName: { type: Type.STRING, description: 'The new name for the character.' },
            newDescription: { type: Type.STRING, description: 'The new description for the character.' },
            newBackstory: { type: Type.STRING, description: 'The new backstory for the character.' },
            newRelationships: { type: Type.STRING, description: 'The new relationships for the character.' },
        },
        required: ['characterId'],
    },
};

const deleteCharacterTool: FunctionDeclaration = {
    name: 'deleteCharacter',
    description: 'Deletes an existing character from the project.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            characterId: { type: Type.STRING, description: 'The ID of the character to delete.' },
        },
        required: ['characterId'],
    },
};


export const functionDeclarations: FunctionDeclaration[] = [
    addOutlineSectionTool,
    updateOutlineSectionTool,
    deleteOutlineSectionTool,
    moveOutlineSectionTool,
    addCharacterTool,
    updateCharacterTool,
    deleteCharacterTool,
];

function formatOutlineWithIds(outline: OutlineSection[], level = 0): string {
    let outlineText = '';
    const indent = '  '.repeat(level);
    for (const section of outline) {
        // Append the ID so the model knows what to target
        outlineText += `${indent}- ${section.title} (ID: ${section.id})\n`;
        if (section.children && section.children.length > 0) {
            outlineText += formatOutlineWithIds(section.children, level + 1);
        }
    }
    return outlineText;
}


function formatProjectContext(project: Project, selectedItem: SelectableItem | null): string {
    let context = `PROJECT CONTEXT:\n`;
    context += `Title: ${project.title}\n`;
    context += `Genre: ${project.genre}\n`;
    context += `Description: ${project.description}\n\n`;

    context += `CHARACTERS (with IDs for targeting):\n`;
    project.characters.forEach(char => {
        context += `- ${char.name} (ID: ${char.id}): ${char.description}\n`;
    });
    context += `\nOUTLINE (with IDs for targeting):\n`;
    context += formatOutlineWithIds(project.outline);


    if (selectedItem) {
        context += `\nCURRENTLY VIEWING:\n`;
        if (selectedItem.type === 'character') {
            context += `Character: ${selectedItem.name} (ID: ${selectedItem.id})\nDetails: ${selectedItem.description}\nBackstory: ${selectedItem.backstory}\n`;
        } else {
            context += `Outline Section: ${selectedItem.title} (ID: ${selectedItem.id})\nContent: ${selectedItem.content}\n`;
            if (selectedItem.characterIds && selectedItem.characterIds.length > 0) {
                const associatedChars = project.characters
                    .filter(c => selectedItem.characterIds!.includes(c.id))
                    .map(c => c.name)
                    .join(', ');
                context += `Associated Characters: ${associatedChars}\n`;
            }
        }
    }
    return context;
}

export const getGeminiResponse = async (
    contents: any[], // The full conversation history in Gemini API format
    project: Project,
    selectedItem: SelectableItem | null
): Promise<GenerateContentResponse> => {
    if (!process.env.API_KEY) {
        throw new Error("AI is disabled. API key is missing.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const projectContext = formatProjectContext(project, selectedItem);
    const systemInstruction = `You are a helpful and creative writing assistant. Your primary function is to help a writer manage their story's structure.
You have been given a set of tools to modify the project's outline and characters.

**CRITICAL INSTRUCTIONS:**
1.  When a user's request involves creating, adding, updating, modifying, deleting, moving, or reordering project data (characters or outline sections), you should prioritize using a tool.
2.  If the user's intent is clear, execute the function call directly. Do not confirm an action before making the tool call.
3.  If the user's intent is clearly intended to call a function, do NOT respond with JSON or code in your text response. Use the tools to make changes.
4.  For general conversation, brainstorming, or questions that do not involve direct modification of the project data, you should respond with a helpful text answer.

Use the provided project context and chat history to give insightful and relevant answers.

${projectContext}`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contents,
            config: {
                systemInstruction: systemInstruction,
                tools: [{ functionDeclarations }],
            },
        });

        return response;
    } catch (error) {
        console.error("Error fetching from Gemini API:", error);
        throw new Error("Sorry, I encountered an error. Please try again.");
    }
};


export const getConsistencyCheckResponse = async (
    section: OutlineSection,
    characters: Character[],
): Promise<string> => {
    if (!process.env.API_KEY) {
        return "AI is disabled. API key is missing.";
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    let characterProfiles = `CHARACTER PROFILES:\n`;
    characters.forEach(char => {
        characterProfiles += `Name: ${char.name}\nDescription: ${char.description}\nBackstory: ${char.backstory}\n---\n`;
    });

    const systemInstruction = `
Please act as a literary editor. I need you to analyze a section of my story for character consistency.

Here are the profiles of the characters involved in this scene:
${characterProfiles}

Here is the story section you need to analyze:
SECTION TITLE: ${section.title}
CONTENT:
${section.content}

Please analyze the content and tell me if the characters' actions, dialogue, or internal thoughts are consistent with their established profiles.
- Point out specific lines or moments that feel inconsistent.
- Explain *why* they feel out of character based on their description and backstory.
- If you find inconsistencies, suggest alternative actions or dialogue that would be more in-character.
- If everything looks consistent, let me know that as well, and perhaps offer some encouragement.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: "Analyze the provided text based on your instructions." }] }],
            config: {
                systemInstruction: systemInstruction,
            }
        });
        return response.text;
    } catch (error) {
        console.error("Error fetching from Gemini API for consistency check:", error);
        return "Sorry, I encountered an error during the consistency check. Please try again.";
    }
};

export const generateCharacterImage = async (character: Character): Promise<string> => {
    if (!process.env.API_KEY) {
        throw new Error("AI is disabled. API key is missing.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `Generate a character portrait based on this description. The style should be realistic digital art, suitable for a character concept. Focus on the facial features and expression.
Name: ${character.name}
Description: ${character.description}`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [{ text: prompt }],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return part.inlineData.data; // This is the base64 string
            }
        }
        throw new Error("No image data found in response.");

    } catch (error) {
        console.error("Error generating character image:", error);
        throw new Error("Sorry, I encountered an error while generating the image. Please try again.");
    }
};

export const generateInitialProjectData = async (
    title: string,
    genre: string,
    description: string
): Promise<{ outline: OutlineSection[], characters: Character[] }> => {
    if (!process.env.API_KEY) {
        throw new Error("AI is disabled. API key is missing.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const systemInstruction = `You are an expert story structure consultant and writer. Based on the provided project format and elevator pitch, generate a foundational story outline and a list of 2-3 key characters.
The outline should follow common narrative structures relevant to the format (e.g., Three-Act Structure for a script, key chapters for a novel).
The characters should be compelling and fit the story's theme.
Return the data in the specified JSON format.`;

    const userPrompt = `
Project Title: ${title}
Format: ${genre}
Elevator Pitch: ${description}

Please generate the initial characters and outline for this project.
`;

    const schema = {
        type: Type.OBJECT,
        properties: {
            characters: {
                type: Type.ARRAY,
                description: 'A list of 2-3 main characters for the story.',
                items: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING, description: "The character's full name." },
                        description: { type: Type.STRING, description: "A brief description of the character's personality, appearance, and role in the story." },
                        backstory: { type: Type.STRING, description: "The character's history and key motivations." },
                        relationships: { type: Type.STRING, description: "How this character relates to other main characters." },
                    },
                    required: ['name', 'description', 'backstory', 'relationships'],
                },
            },
            outline: {
                type: Type.ARRAY,
                description: 'A structured story outline with key plot points, acts, or chapters.',
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING, description: 'The title of this outline section (e.g., Act I, Chapter 1: The Inciting Incident).' },
                        content: { type: Type.STRING, description: 'A detailed summary of what happens in this section of the story.' },
                    },
                    required: ['title', 'content'],
                },
            },
        },
        required: ['characters', 'outline'],
    };


    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });
        
        const jsonResponse = JSON.parse(response.text);
        
        // Add IDs and types to the generated data
        const characters = jsonResponse.characters.map((char: Omit<Character, 'id' | 'type'>) => ({
            ...char,
            id: uuidv4(),
            type: 'character' as const,
        }));

        const outline = jsonResponse.outline.map((section: Omit<OutlineSection, 'id' | 'type'>) => ({
            ...section,
            id: uuidv4(),
            type: 'outline' as const,
            children: [],
        }));
        
        return { characters, outline };

    } catch (error) {
        console.error("Error generating initial project data:", error);
        throw new Error("The AI failed to generate project data. It might be experiencing high traffic. Please try again.");
    }
};