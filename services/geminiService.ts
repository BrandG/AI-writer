import { GoogleGenAI, Modality, FunctionDeclaration, Type, GenerateContentResponse } from "@google/genai";
import { Project, ChatMessage, SelectableItem, OutlineSection, Character } from '../types';

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

export const functionDeclarations: FunctionDeclaration[] = [
    addOutlineSectionTool,
    updateOutlineSectionTool,
    deleteOutlineSectionTool,
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

    context += `CHARACTERS:\n`;
    project.characters.forEach(char => {
        context += `- ${char.name}: ${char.description}\n`;
    });
    context += `\nOUTLINE (with IDs for targeting):\n`;
    context += formatOutlineWithIds(project.outline);


    if (selectedItem) {
        context += `\nCURRENTLY VIEWING:\n`;
        if (selectedItem.type === 'character') {
            context += `Character: ${selectedItem.name}\nDetails: ${selectedItem.description}\nBackstory: ${selectedItem.backstory}\n`;
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
    const systemInstruction = `You are a helpful and creative writing assistant. Your goal is to help a writer develop their story. Use the provided project context and chat history to give insightful and relevant answers.
You have access to tools to modify the project outline. If the user asks for a change to the outline, use the provided functions. Otherwise, respond with text.

${projectContext}`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contents,
            config: {
                systemInstruction: systemInstruction,
            },
            tools: [{ functionDeclarations }],
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
