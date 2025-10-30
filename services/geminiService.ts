import { GoogleGenAI, Type, FunctionDeclaration, GenerateContentResponse } from "@google/genai";
import { Project, SelectableItem, OutlineSection, Character, UnifiedAIResponse, AiService, Note } from '../types';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from "openai"; // Using OpenAI types for conversation history for compatibility

// Helper to convert OpenAI conversation history format to Gemini's format
const convertToGeminiHistory = (history: OpenAI.Chat.Completions.ChatCompletionMessageParam[]) => {
    const geminiHistory: any[] = [];
    for (let i = 0; i < history.length; i++) {
        const message = history[i];

        if (message.role === 'user') {
            geminiHistory.push({ role: 'user', parts: [{ text: message.content as string }] });
        } else if (message.role === 'assistant') {
            if (message.content) {
                geminiHistory.push({ role: 'model', parts: [{ text: message.content }] });
            }
            if (message.tool_calls) {
                geminiHistory.push({
                    role: 'model',
                    parts: message.tool_calls.flatMap(tc => {
                        if (tc.type === 'function') {
                            return [{
                                functionCall: {
                                    name: tc.function.name,
                                    args: JSON.parse(tc.function.arguments),
                                }
                            }];
                        }
                        return [];
                    })
                });
            }
        } else if (message.role === 'tool' && message.tool_call_id) {
            const lastMessage = history[i - 1];
            if (lastMessage?.role === 'assistant' && lastMessage.tool_calls) {
                const matchingToolCall = lastMessage.tool_calls.find(
                    tc => tc.type === 'function' && tc.id === message.tool_call_id
                );

                if (matchingToolCall && matchingToolCall.type === 'function') {
                    let functionResponseResult = {};
                    try {
                        // The content should be a JSON string of the result object
                        functionResponseResult = JSON.parse(message.content as string);
                    } catch (e) {
                        // If it's not JSON, pass it as a simple string result
                        functionResponseResult = { result: message.content };
                    }

                    geminiHistory.push({
                        role: 'user', // Gemini treats function responses as user input
                        parts: [{
                            functionResponse: {
                                name: matchingToolCall.function.name,
                                response: functionResponseResult,
                            }
                        }]
                    });
                }
            }
        }
    }
    return geminiHistory;
};


// Helper functions for formatting context (same as in openaiService)
function formatOutlineWithIds(outline: OutlineSection[], level = 0): string {
    let outlineText = '';
    const indent = '  '.repeat(level);
    for (const section of outline) {
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

    context += `\nPROJECT NOTES (with IDs for targeting):\n`;
    project.notes.forEach(note => {
        context += `- ${note.title} (ID: ${note.id})\n`;
    });
    context += '\n\n';

    if (selectedItem) {
        context += `\nCURRENTLY VIEWING:\n`;
        if (selectedItem.type === 'character') {
            const char = selectedItem as Character;
            context += `Character: ${char.name} (ID: ${char.id})\n`;
            context += `Full Profile: ${JSON.stringify(char, null, 2)}\n`;
        } else if (selectedItem.type === 'outline') {
            context += `Outline Section: ${selectedItem.title} (ID: ${selectedItem.id})\nContent: ${selectedItem.content}\n`;
        } else if (selectedItem.type === 'note') {
            context += `Note: ${selectedItem.title} (ID: ${selectedItem.id})\nContent: ${selectedItem.content}\n`;
        }
    }
    return context;
}

const getToolsAsFunctionDeclarations = (): FunctionDeclaration[] => {
    // This is verbose, but it's how Gemini requires tool definitions.
    return [
        {
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
        },
        {
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
        },
        {
            name: 'deleteOutlineSection',
            description: 'Deletes an existing section from the project outline.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    sectionId: { type: Type.STRING, description: 'The ID of the section to delete.' },
                },
                required: ['sectionId'],
            },
        },
        {
            name: 'moveOutlineSection',
            description: 'Moves an existing section to a new position in the outline.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    sectionId: { type: Type.STRING, description: 'The ID of the section to move.' },
                    targetParentId: { type: Type.STRING, description: 'Optional. The ID of the new parent section.' },
                    targetSiblingId: { type: Type.STRING, description: 'Optional. The ID of an existing section to place the moved section next to.' },
                    position: { type: Type.STRING, description: "Required if 'targetSiblingId' is provided. Can be 'before' or 'after'." },
                },
                required: ['sectionId'],
            },
        },
        {
            name: 'addCharacter',
            description: 'Adds a new character to the project, including their core identity details.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    description: { type: Type.STRING },
                    originStory: { type: Type.STRING },
                    familyMentors: { type: Type.STRING },
                    secretsRegrets: { type: Type.STRING },
                    relationshipsTimeline: { type: Type.STRING },
                    aliases: { type: Type.STRING },
                    age: { type: Type.STRING },
                    gender: { type: Type.STRING },
                    species: { type: Type.STRING },
                    occupation: { type: Type.STRING },
                    affiliations: { type: Type.STRING },
                    heightBuild: { type: Type.STRING },
                    faceHairEyes: { type: Type.STRING },
                    styleOutfit: { type: Type.STRING },
                    vocalTraits: { type: Type.STRING },
                    healthAbilities: { type: Type.STRING },
                    coreMotivation: { type: Type.STRING },
                    longTermGoal: { type: Type.STRING },
                    fearFlaw: { type: Type.STRING },
                    moralAlignment: { type: Type.STRING },
                    temperament: { type: Type.STRING },
                    emotionalTriggers: { type: Type.STRING },
                    storyRole: { type: Type.STRING },
                    introductionPoint: { type: Type.STRING },
                    arcSummary: { type: Type.STRING },
                    conflictContribution: { type: Type.STRING },
                    changeMetric: { type: Type.STRING },
                    dictionSlangTone: { type: Type.STRING },
                    gesturesHabits: { type: Type.STRING },
                    signaturePhrases: { type: Type.STRING },
                    internalThoughtStyle: { type: Type.STRING },
                    homeEnvironmentInfluence: { type: Type.STRING },
                    culturalReligiousBackground: { type: Type.STRING },
                    economicPoliticalStatus: { type: Type.STRING },
                    technologyMagicInteraction: { type: Type.STRING },
                    tiesToWorldEvents: { type: Type.STRING },
                    firstLastAppearance: { type: Type.STRING },
                    actorVisualReference: { type: Type.STRING },
                    symbolicObjectsThemes: { type: Type.STRING },
                    evolutionNotes: { type: Type.STRING },
                    crossLinks: { type: Type.STRING },
                    innerMonologueExample: { type: Type.STRING },
                    playlistSoundPalette: { type: Type.STRING },
                    colorPaletteMotifs: { type: Type.STRING },
                    aiGameReference: { type: Type.STRING },
                    developmentNotes: { type: Type.STRING },
                },
                required: [
                    'name', 'description', 'originStory', 'familyMentors', 'secretsRegrets', 'relationshipsTimeline', 'aliases', 'age', 'gender', 'species',
                    'occupation', 'affiliations', 'heightBuild', 'faceHairEyes', 'styleOutfit', 'vocalTraits', 'healthAbilities', 'coreMotivation',
                    'longTermGoal', 'fearFlaw', 'moralAlignment', 'temperament', 'emotionalTriggers', 'storyRole', 'introductionPoint', 'arcSummary',
                    'conflictContribution', 'changeMetric', 'dictionSlangTone', 'gesturesHabits', 'signaturePhrases', 'internalThoughtStyle',
                    'homeEnvironmentInfluence', 'culturalReligiousBackground', 'economicPoliticalStatus', 'technologyMagicInteraction', 'tiesToWorldEvents',
                    'firstLastAppearance', 'actorVisualReference', 'symbolicObjectsThemes', 'evolutionNotes', 'crossLinks', 'innerMonologueExample',
                    'playlistSoundPalette', 'colorPaletteMotifs', 'aiGameReference', 'developmentNotes'
                ],
            },
        },
        {
            name: 'updateCharacter',
            description: 'Updates an existing character in the project.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    characterId: { type: Type.STRING, description: 'The ID of the character to update.' },
                    newName: { type: Type.STRING, description: 'The new name for the character.' },
                    newDescription: { type: Type.STRING, description: 'The new description for the character.' },
                    //... other fields
                },
                required: ['characterId'],
            },
        },
        {
            name: 'deleteCharacter',
            description: 'Deletes an existing character from the project.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    characterId: { type: Type.STRING, description: 'The ID of the character to delete.' },
                },
                required: ['characterId'],
            },
        },
    ];
};

const getAIResponse = async (
    conversationHistory: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    project: Project,
    selectedItem: SelectableItem | null
): Promise<UnifiedAIResponse> => {
    if (!process.env.API_KEY) {
        throw new Error("AI is disabled. Google API key is missing.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const projectContext = formatProjectContext(project, selectedItem);
    const systemInstruction = `You are a helpful and creative writing assistant. Your primary function is to help a writer manage their story's structure.
You have been given a set of tools to modify the project's outline and characters.

**CRITICAL INSTRUCTIONS:**
1. When a user's request involves creating, adding, updating, modifying, deleting, moving, or reordering project data (characters or outline sections), you should prioritize using a tool.
2. If the user's intent is clear, execute the function call directly. Do not ask for confirmation.
3. For general conversation, brainstorming, or questions that do not involve direct modification of the project data, you should respond with a helpful text answer.

Use the provided project context and chat history to give insightful and relevant answers.`;
    
    const geminiHistory = convertToGeminiHistory(conversationHistory);

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: geminiHistory,
            config: {
                systemInstruction: `${systemInstruction}\n\n${projectContext}`,
                tools: [{ functionDeclarations: getToolsAsFunctionDeclarations() }],
            }
        });

        const text = response.text;
        const functionCalls = response.functionCalls;
        
        // Adapt Gemini's response to the unified format
        const toolCalls = functionCalls?.map((fc, index) => ({
            id: fc.id || `call_${index}_${Date.now()}`,
            function: {
                name: fc.name,
                arguments: JSON.stringify(fc.args),
            },
        }));

        return {
            text: text || null,
            toolCalls: toolCalls || undefined,
        };

    } catch (error) {
        console.error("Error fetching from Gemini API:", error);
        throw new Error("Sorry, I encountered an error with the Gemini AI. Please try again.");
    }
};

const formatCharacterForConsistencyCheck = (character: Character): string => {
    let profile = `--- CHARACTER: ${character.name} ---\n`;
    const addField = (label: string, value: string | undefined | null) => {
        if (value && value.trim()) profile += `${label}: ${value}\n`;
    };
    addField("Description", character.description);
    addField("Health/Abilities/Limitations", character.healthAbilities);
    addField("Height/Build", character.heightBuild);
    addField("Face/Hair/Eyes", character.faceHairEyes);
    addField("Style/Outfit", character.styleOutfit);
    // Add other relevant physical fields
    profile += "\n";
    return profile;
};

const getConsistencyCheckResponse = async (
    section: OutlineSection,
    characters: Character[],
): Promise<string> => {
     if (!process.env.API_KEY) {
        return "AI is disabled. Google API key is missing.";
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const characterProfiles = characters.map(formatCharacterForConsistencyCheck).join('');
    const prompt = `You are a meticulous continuity editor. Your task is to find physical contradictions in a story scene by cross-referencing it with provided character profiles.

**CRITICAL INSTRUCTIONS:**
You must perform two specific checks for every character mentioned in the scene:

1.  **ACTION vs. ABILITY CHECK:**
    - Read the scene and identify what each character *does*.
    - Compare these actions to the character's profile, specifically their 'Health/Abilities/Limitations'.
    - Flag any action that should be impossible or difficult based on their profile (e.g., a character with a broken arm lifting something heavy).

2.  **DESCRIPTION vs. ATTRIBUTE CHECK:**
    - Read the scene and identify any physical descriptions of a character (e.g., "her blonde hair", "his tall frame", "wearing a red coat").
    - Compare these descriptions to the character's profile, specifically fields like 'Face/Hair/Eyes', 'Height/Build', and 'Style/Outfit'.
    - Flag any description that directly contradicts their profile (e.g., the scene mentions blonde hair, but the profile says dark hair).

**GENERAL RULES:**
- **BE EXHAUSTIVE:** Your primary goal is to find *every* contradiction. Do not stop after finding the first one. Your success is measured by your thoroughness.
- **FOCUS ON PHYSICAL FACTS:** Do not analyze motivation, psychology, or emotional consistency. Stick to concrete, physical details.
- **BE CONCISE:** Your response must be extremely brief.

**OUTPUT RULES:**
- If you find **NO** contradictions after performing both checks, your entire response MUST be the single phrase: \`No inconsistencies found.\`
- If you find one or more contradictions, provide a brief, numbered list of **ALL** contradictions found. For each item, state the character and the specific contradiction.

**Example of a good error report:**
1. Kaelen Vance: Profile states he has a broken arm, but the scene describes him lifting a heavy crate with both hands. (Action vs. Ability failure)
2. Eva Rostova: Profile says she has dark hair, but the scene describes her tossing her blonde hair. (Description vs. Attribute failure)
3. Elias Thorne: Scene says he read a sign from 50 meters away, but his profile states he is near-sighted and requires glasses. (Action vs. Ability failure)

**DO NOT** provide explanations, suggestions, or positive feedback.

Here are the character profiles to use for your analysis:
${characterProfiles}

Here is the scene to analyze:
SCENE TITLE: ${section.title}
SCENE CONTENT:
${section.content}

Now, perform the analysis based on the rules above. Re-read the scene multiple times if necessary to ensure no contradictions are missed.`;
console.log(prompt);
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Error fetching from Gemini API for consistency check:", error);
        return "Sorry, I encountered an error during the consistency check with Gemini. Please try again.";
    }
};

const generateCharacterImage = async (character: Character): Promise<string> => {
    if (!process.env.API_KEY) {
        throw new Error("AI is disabled. Google API key is missing.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Character portrait of ${character.name}. Style: realistic digital concept art.
Description: ${character.description}.
Appearance: ${character.faceHairEyes}, ${character.heightBuild}.
Outfit: ${character.styleOutfit}.
Focus on a clear, expressive facial portrait.`;
    
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: '1:1',
            },
        });

        const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
        return base64ImageBytes;
    } catch (error) {
        console.error("Error generating character image with Gemini:", error);
        throw new Error("Sorry, I encountered an error while generating the image with Gemini.");
    }
};

const generateIllustrationForSection = async (section: OutlineSection, genre: string): Promise<string> => {
    if (!process.env.API_KEY) {
        throw new Error("AI is disabled. Google API key is missing.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Digital painting illustration for a scene from a ${genre} story.
Scene Title: "${section.title}".
Scene Description: ${section.content}
Style: Atmospheric, evocative, cinematic, matching the ${genre} genre. No text or titles in the image.`;

    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: '16:9',
            },
        });

        const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
        return base64ImageBytes;
    } catch (error) {
        console.error("Error generating illustration with Gemini:", error);
        throw new Error("Sorry, I encountered an error while generating the illustration with Gemini.");
    }
};

const generateInitialProjectData = async (
    title: string,
    genre: string,
    description: string
): Promise<{ outline: OutlineSection[], characters: Character[], notes: Note[] }> => {
    if (!process.env.API_KEY) {
        throw new Error("AI is disabled. Google API key is missing.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `You are an expert story structure consultant.
Project Title: ${title}
Format/Genre: ${genre}
Elevator Pitch: ${description}

Please generate the initial characters, outline, and notes for this project.
Follow the provided JSON schema precisely.
For each character, be as creative and detailed as possible when filling out all fields.
The outline should follow a standard narrative structure (e.g., Three-Act Structure).
The notes section should contain a few notes, each with a title and content, for initial ideas, potential plot points, or questions to explore.`;

    // Define all character fields for the schema
    const characterProperties = {
        name: { type: Type.STRING },
        description: { type: Type.STRING },
        originStory: { type: Type.STRING },
        familyMentors: { type: Type.STRING },
        secretsRegrets: { type: Type.STRING },
        relationshipsTimeline: { type: Type.STRING },
        aliases: { type: Type.STRING },
        age: { type: Type.STRING },
        gender: { type: Type.STRING },
        species: { type: Type.STRING },
        occupation: { type: Type.STRING },
        affiliations: { type: Type.STRING },
        heightBuild: { type: Type.STRING },
        faceHairEyes: { type: Type.STRING },
        styleOutfit: { type: Type.STRING },
        vocalTraits: { type: Type.STRING },
        healthAbilities: { type: Type.STRING },
        coreMotivation: { type: Type.STRING },
        longTermGoal: { type: Type.STRING },
        fearFlaw: { type: Type.STRING },
        moralAlignment: { type: Type.STRING },
        temperament: { type: Type.STRING },
        emotionalTriggers: { type: Type.STRING },
        storyRole: { type: Type.STRING },
        introductionPoint: { type: Type.STRING },
        arcSummary: { type: Type.STRING },
        conflictContribution: { type: Type.STRING },
        changeMetric: { type: Type.STRING },
        dictionSlangTone: { type: Type.STRING },
        gesturesHabits: { type: Type.STRING },
        signaturePhrases: { type: Type.STRING },
        internalThoughtStyle: { type: Type.STRING },
        homeEnvironmentInfluence: { type: Type.STRING },
        culturalReligiousBackground: { type: Type.STRING },
        economicPoliticalStatus: { type: Type.STRING },
        technologyMagicInteraction: { type: Type.STRING },
        tiesToWorldEvents: { type: Type.STRING },
        firstLastAppearance: { type: Type.STRING },
        actorVisualReference: { type: Type.STRING },
        symbolicObjectsThemes: { type: Type.STRING },
        evolutionNotes: { type: Type.STRING },
        crossLinks: { type: Type.STRING },
        innerMonologueExample: { type: Type.STRING },
        playlistSoundPalette: { type: Type.STRING },
        colorPaletteMotifs: { type: Type.STRING },
        aiGameReference: { type: Type.STRING },
        developmentNotes: { type: Type.STRING },
    };

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        characters: {
                            type: Type.ARRAY,
                            description: "A list of 2-3 key characters for the story.",
                            items: {
                                type: Type.OBJECT,
                                properties: characterProperties,
                                required: Object.keys(characterProperties)
                            }
                        },
                        outline: {
                            type: Type.ARRAY,
                            description: "A list of top-level outline sections for the story (e.g., Act 1, Act 2, Act 3).",
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING },
                                    content: { type: Type.STRING }
                                },
                                required: ['title', 'content']
                            }
                        },
                        notes: {
                            type: Type.ARRAY,
                            description: "A scratchpad for initial ideas, plot points, or research notes, organized into separate notes.",
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING },
                                    content: { type: Type.STRING }
                                },
                                required: ['title', 'content']
                            }
                        }
                    },
                    required: ['characters', 'outline', 'notes']
                }
            },
        });
        const jsonResponse = JSON.parse(response.text.trim());

        // Add IDs and types to the generated data
        const characters = jsonResponse.characters.map((char: Omit<Character, 'id' | 'type'>) => ({
            ...char, id: uuidv4(), type: 'character' as const,
        }));
        const outline = jsonResponse.outline.map((section: Omit<OutlineSection, 'id' | 'type'>) => ({
            ...section, id: uuidv4(), type: 'outline' as const, children: [],
        }));
        const notes = jsonResponse.notes.map((note: Omit<Note, 'id' | 'type'>) => ({
            ...note, id: uuidv4(), type: 'note' as const
        }));
        
        return { characters, outline, notes: notes || [] };

    } catch (error) {
        console.error("Error generating initial project data with Gemini:", error);
        if (error instanceof SyntaxError) {
            console.error("Gemini returned invalid JSON.");
        }
        throw new Error("The Gemini AI failed to generate project data. Please try again.");
    }
};

// Ensure the service object matches the AiService interface
export const geminiService: AiService = {
    generateInitialProjectData,
    getAIResponse,
    getConsistencyCheckResponse,
    generateCharacterImage,
    generateIllustrationForSection,
};