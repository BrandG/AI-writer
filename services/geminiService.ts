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
    
    // Gemini Rule: History must start with a User message.
    // If the first message is Model (e.g. initial greeting), remove it.
    if (geminiHistory.length > 0 && geminiHistory[0].role === 'model') {
        geminiHistory.shift();
    }

    // Gemini Rule: Consecutive messages from the same role are not allowed.
    // Merge consecutive messages.
    const mergedHistory: any[] = [];
    for (const msg of geminiHistory) {
        if (mergedHistory.length > 0 && mergedHistory[mergedHistory.length - 1].role === msg.role) {
            const prevMsg = mergedHistory[mergedHistory.length - 1];
            // Merge parts
            prevMsg.parts = [...prevMsg.parts, ...msg.parts];
        } else {
            mergedHistory.push(msg);
        }
    }

    return mergedHistory;
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
        context += `- ${char.name} (ID: ${char.id}) [Group: ${char.group || 'Ungrouped'}]: ${char.description}\n`;
    });
    context += `\nOUTLINE (with IDs for targeting):\n`;
    context += formatOutlineWithIds(project.outline);

    context += `\nPROJECT NOTES (with IDs for targeting):\n`;
    project.notes.forEach(note => {
        context += `- ${note.title} (ID: ${note.id})\n`;
    });

    if (project.taskLists && project.taskLists.length > 0) {
        context += `\nTASK LISTS (with IDs for targeting):\n`;
        project.taskLists.forEach(list => {
            context += `- ${list.title} (ID: ${list.id}): ${list.tasks.map(t => `${t.text} [${t.isCompleted ? 'x' : ' '}]`).join(', ')}\n`;
        });
    }

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
        } else if (selectedItem.type === 'taskList') {
             context += `Task List: ${selectedItem.title} (ID: ${selectedItem.id})\nTasks: ${JSON.stringify(selectedItem.tasks)}\n`;
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
                    group: { type: Type.STRING, description: 'The group or category this character belongs to (e.g., Protagonist, Antagonist, Supporting).' },
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
            description: 'Updates one or more fields for an existing character in the project.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    characterId: { type: Type.STRING, description: 'The ID of the character to update.' },
                    newName: { type: Type.STRING, description: 'The new name for the character.' },
                    newDescription: { type: Type.STRING, description: 'The new description for the character.' },
                    newGroup: { type: Type.STRING, description: 'The new group or category for the character.' },
                    newOriginStory: { type: Type.STRING, description: "The character's new origin story." },
                    newFamilyMentors: { type: Type.STRING, description: "The character's new family, mentors, or enemies." },
                    newSecretsRegrets: { type: Type.STRING, description: "The character's new secrets or regrets." },
                    newRelationshipsTimeline: { type: Type.STRING, description: "The character's new relationships timeline." },
                    newAliases: { type: Type.STRING, description: "The character's new aliases or titles." },
                    newAge: { type: Type.STRING, description: "The character's new age or birthdate." },
                    newGender: { type: Type.STRING, description: "The character's new gender or pronouns." },
                    newSpecies: { type: Type.STRING, description: "The character's new species or race." },
                    newOccupation: { type: Type.STRING, description: "The character's new occupation or rank." },
                    newAffiliations: { type: Type.STRING, description: "The character's new affiliations." },
                    newHeightBuild: { type: Type.STRING, description: "The character's new height, build, or posture." },
                    newFaceHairEyes: { type: Type.STRING, description: "The character's new face, hair, or eyes." },
                    newStyleOutfit: { type: Type.STRING, description: "The character's new style or outfit." },
                    newVocalTraits: { type: Type.STRING, description: "The character's new vocal traits." },
                    newHealthAbilities: { type: Type.STRING, description: "The character's new health or abilities." },
                    newCoreMotivation: { type: Type.STRING, description: "The character's new core motivation." },
                    newLongTermGoal: { type: Type.STRING, description: "The character's new long-term goal." },
                    newFearFlaw: { type: Type.STRING, description: "The character's new fear or flaw." },
                    newMoralAlignment: { type: Type.STRING, description: "The character's new moral alignment." },
                    newTemperament: { type: Type.STRING, description: "The character's new temperament." },
                    newEmotionalTriggers: { type: Type.STRING, description: "The character's new emotional triggers." },
                    newStoryRole: { type: Type.STRING, description: "The character's new story role or archetype." },
                    newIntroductionPoint: { type: Type.STRING, description: "The character's new introduction point in the story." },
                    newArcSummary: { type: Type.STRING, description: "The character's new arc summary." },
                    newConflictContribution: { type: Type.STRING, description: "The character's new contribution to conflict." },
                    newChangeMetric: { type: Type.STRING, description: "The character's new change metric or learned lesson." },
                    newDictionSlangTone: { type: Type.STRING, description: "The character's new diction, slang, or tone." },
                    newGesturesHabits: { type: Type.STRING, description: "The character's new gestures or habits." },
                    newSignaturePhrases: { type: Type.STRING, description: "The character's new signature phrases." },
                    newInternalThoughtStyle: { type: Type.STRING, description: "The character's new internal thought style." },
                    newHomeEnvironmentInfluence: { type: Type.STRING, description: "The character's new home or environmental influence." },
                    newCulturalReligiousBackground: { type: Type.STRING, description: "The character's new cultural or religious background." },
                    newEconomicPoliticalStatus: { type: Type.STRING, description: "The character's new economic or political status." },
                    newTechnologyMagicInteraction: { type: Type.STRING, description: "The character's new interaction with technology or magic." },
                    newTiesToWorldEvents: { type: Type.STRING, description: "The character's new ties to world events." },
                    newFirstLastAppearance: { type: Type.STRING, description: "The character's new first and last appearance." },
                    newActorVisualReference: { type: Type.STRING, description: "The character's new actor or visual reference." },
                    newSymbolicObjectsThemes: { type: Type.STRING, description: "The character's new symbolic objects or themes." },
                    newEvolutionNotes: { type: Type.STRING, description: "The character's new evolution notes." },
                    newCrossLinks: { type: Type.STRING, description: "The character's new cross-links." },
                    newInnerMonologueExample: { type: Type.STRING, description: "The character's new inner monologue example." },
                    newPlaylistSoundPalette: { type: Type.STRING, description: "The character's new playlist or sound palette." },
                    newColorPaletteMotifs: { type: Type.STRING, description: "The character's new color palette or motifs." },
                    newAiGameReference: { type: Type.STRING, description: "The character's new AI or game reference data." },
                    newDevelopmentNotes: { type: Type.STRING, description: "The character's new development notes." },
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
    selectedItem: SelectableItem | null,
    systemInstruction: string
): Promise<UnifiedAIResponse> => {
    if (!process.env.API_KEY) {
        throw new Error("AI is disabled. Google API key is missing.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const projectContext = formatProjectContext(project, selectedItem);
    const geminiHistory = convertToGeminiHistory(conversationHistory);
    
    // Debug Logging
    const payload = {
        model: 'gemini-2.5-flash',
        contents: geminiHistory,
        config: {
            systemInstruction: `${systemInstruction}\n\n${projectContext}`,
            tools: [{ functionDeclarations: getToolsAsFunctionDeclarations() }],
        }
    };
    console.log("Gemini Request Payload (getAIResponse):", JSON.stringify(payload, null, 2));


    try {
        // Use gemini-2.5-flash for the main chat interface. 
        // It provides the most stable experience for Function Calling (Tools) and avoids the 
        // "Function call is missing a thought signature" error that can occur with gemini-3-pro-preview
        // when mixing tool use with experimental thinking features.
        const response: GenerateContentResponse = await ai.models.generateContent(payload);

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

    const payload = {
        model: 'gemini-3-pro-preview',
        contents: prompt,
    };
    console.log("Gemini Request Payload (getConsistencyCheckResponse):", JSON.stringify(payload, null, 2));

    try {
        const response = await ai.models.generateContent(payload);
        return response.text || "No response text.";
    } catch (error) {
        console.error("Error fetching from Gemini API for consistency check:", error);
        return "Sorry, I encountered an error during the consistency check with Gemini. Please try again.";
    }
};

const getReadingLevel = async (text: string): Promise<string> => {
    if (!process.env.API_KEY) {
        return "AI is disabled. Google API key is missing.";
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Analyze the reading level of the following text.
    1. Calculate or estimate the Flesch-Kincaid Grade Level.
    2. Describe the sentence structure complexity and vocabulary.
    3. Suggest who the target audience might be based on this level.

    Keep the response concise and helpful for a writer.

    Text:
    "${text}"`;

    const payload = {
        model: 'gemini-2.5-flash',
        contents: prompt,
    };
    console.log("Gemini Request Payload (getReadingLevel):", JSON.stringify(payload, null, 2));

    try {
        const response = await ai.models.generateContent(payload);
        return response.text || "No response text.";
    } catch (error) {
        console.error("Error fetching from Gemini API for reading level:", error);
        return "Sorry, I encountered an error checking the reading level.";
    }
};

const cleanUpText = async (text: string): Promise<string> => {
    if (!process.env.API_KEY) {
        return "AI is disabled. Google API key is missing.";
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `You are a professional copy editor. Your goal is to 'clean up' the following text. 
    
    This means:
    1. Fix grammar, spelling, and punctuation errors.
    2. Make minor adjustments to sentence structure for clarity and flow.
    3. Remove redundant words or phrases.
    
    CRITICAL: You must strictly PRESERVE the original voice, tone, style, and meaning of the text. Do not rewrite the story or change the content, just polish the prose.
    
    Return ONLY the cleaned text. Do not add any conversational filler.
    
    Text to clean:
    "${text}"`;

    const payload = {
        model: 'gemini-2.5-flash',
        contents: prompt,
    };
    console.log("Gemini Request Payload (cleanUpText):", JSON.stringify(payload, null, 2));

    try {
        const response = await ai.models.generateContent(payload);
        return response.text || text;
    } catch (error) {
        console.error("Error fetching from Gemini API for text cleanup:", error);
        throw new Error("Sorry, I encountered an error cleaning up the text.");
    }
};

const generateCharacterImage = async (character: Character): Promise<string> => {
    if (!process.env.API_KEY) {
        throw new Error("AI is disabled. Google API key is missing.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const basicInfo = [
        character.age ? `Age: ${character.age}.` : '',
        character.gender ? `Gender: ${character.gender}.` : '',
        character.species ? `Species: ${character.species}.` : ''
    ].filter(Boolean).join(' ');

    const prompt = `Photographic portrait of ${character.name}. Style: Photorealistic, cinematic 8k photography, highly detailed.
Basic Info: ${basicInfo}
Description: ${character.description}.
Appearance: ${character.faceHairEyes}, ${character.heightBuild}.
Outfit: ${character.styleOutfit}.
${character.actorVisualReference ? `Visual Reference: ${character.actorVisualReference}.` : ''}
Focus on a clear, expressive facial portrait.`;
    
    const payload = {
        model: 'gemini-2.5-flash-image', // Nano Banana model
        contents: { parts: [{ text: prompt }] },
        config: {
            imageConfig: {
                aspectRatio: '1:1',
            },
        },
    };
    console.log("Gemini Request Payload (generateCharacterImage):", JSON.stringify(payload, null, 2));

    try {
        const response = await ai.models.generateContent(payload);

        // Check for safety blocking
        if (response.candidates?.[0]?.finishReason === 'SAFETY') {
             throw new Error("Image generation was blocked due to safety guidelines.");
        }

        // Find the image part
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return part.inlineData.data;
            }
        }
        throw new Error("No image found in response.");

    } catch (error) {
        console.error("Error generating character image with Gemini:", error);
        if (error instanceof Error) throw error;
        throw new Error("Sorry, I encountered an error while generating the image with Gemini.");
    }
};

const generateIllustrationForSection = async (section: OutlineSection, genre: string): Promise<string> => {
    if (!process.env.API_KEY) {
        throw new Error("AI is disabled. Google API key is missing.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Photorealistic image for a scene from a ${genre} story.
Scene Title: "${section.title}".
Scene Description: ${section.content}
Style: Cinematic photography, 8k resolution, highly detailed, realistic lighting matching the ${genre} genre. No text or titles in the image.`;

    const payload = {
        model: 'gemini-2.5-flash-image', // Nano Banana model
        contents: { parts: [{ text: prompt }] },
        config: {
            imageConfig: {
                aspectRatio: '16:9',
            },
        },
    };
    console.log("Gemini Request Payload (generateIllustrationForSection):", JSON.stringify(payload, null, 2));

    try {
        const response = await ai.models.generateContent(payload);

         // Check for safety blocking
        if (response.candidates?.[0]?.finishReason === 'SAFETY') {
             throw new Error("Image generation was blocked due to safety guidelines.");
        }

        // Find the image part
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return part.inlineData.data;
            }
        }
        throw new Error("No image found in response.");

    } catch (error) {
        console.error("Error generating illustration with Gemini:", error);
        if (error instanceof Error) throw error;
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
        group: { type: Type.STRING, description: 'The group or category this character belongs to (e.g., Protagonist, Antagonist).' },
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
    
    const payload = {
        model: "gemini-3-pro-preview",
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
            },
            // thinkingConfig removed to ensure reliable JSON generation
        },
    };
    console.log("Gemini Request Payload (generateInitialProjectData):", JSON.stringify(payload, null, 2));

    try {
        const response = await ai.models.generateContent(payload);
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

const getGraphAnalysis = async (project: Project): Promise<string> => {
    if (!process.env.API_KEY) {
        return "AI is disabled. Google API key is missing.";
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // Construct a textual representation of the graph
    let graphDescription = `Project: ${project.title}\nGenre: ${project.genre}\n\n`;
    
    graphDescription += `NODES (Characters):\n`;
    project.characters.forEach(c => {
        graphDescription += `- ${c.name} (Role: ${c.storyRole})\n`;
    });

    graphDescription += `\nNODES (Outline Sections & Associations):\n`;
    const describeSections = (sections: OutlineSection[]) => {
        sections.forEach(s => {
             const associatedChars = s.characterIds 
                ? project.characters.filter(c => s.characterIds!.includes(c.id)).map(c => c.name).join(', ') 
                : "None";
            graphDescription += `- Scene: "${s.title}" contains characters: [${associatedChars}]\n`;
            if (s.children) describeSections(s.children);
        });
    }
    describeSections(project.outline);

    const prompt = `You are a specialized Story Graph Analyst.
    
Analyze the following story structure based on its nodes (scenes/characters) and edges (associations).

**Goal:** Identify structural weaknesses, disconnected elements, and opportunities for tighter integration.

**Look for:**
1. **Unconnected Characters:** Are there characters who rarely appear or are isolated from the main plot threads?
2. **Plot Holes/Gaps:** Are there long sequences of scenes where key protagonists are missing?
3. **Thematic Clustering:** Do the scenes grouped by character associations make narrative sense?
4. **Suggestions:** Briefly suggest 1-2 ways to improve the connectivity of the story graph (e.g., "Connect Character X to Scene Y to increase tension").

**Format:**
Provide a concise bulleted list of insights. Be specific.

Data:
${graphDescription}`;

    const payload = {
        model: 'gemini-3-pro-preview',
        contents: prompt,
        // thinkingConfig removed to resolve invalid argument errors
    };
    console.log("Gemini Request Payload (getGraphAnalysis):", JSON.stringify(payload, null, 2));

    try {
        const response = await ai.models.generateContent(payload);
        return response.text || "No analysis generated.";
    } catch (error) {
        console.error("Error fetching graph analysis:", error);
        return "Sorry, I couldn't analyze the graph structure at this time.";
    }
};

const runCouncil = async (
    prompt: string,
    project: Project,
    selectedItem: SelectableItem | null
): Promise<string> => {
    if (!process.env.API_KEY) {
        throw new Error("AI is disabled. Google API key is missing.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const projectContext = formatProjectContext(project, selectedItem);

    // 1. Define the personas
    const councilMembers = [
        {
            name: "The Developmental Editor",
            role: "Focus: The Big Picture. Ignore grammar. Look at structure, pacing, and motivation. Does this paragraph earn its keep? Is the tone consistent? Does the argument flow logically?",
        },
        {
            name: "The Ghostwriter",
            role: "Focus: Elevation. Your job is to 'plus' the text. Don't change the meaning, but make the prose sing. Suggest stronger verbs, more evocative metaphors, and punchier phrasing.",
        },
        {
            name: "The Copy Editor",
            role: "Focus: Ruthless Mechanics. You are a strict New York publishing editor. Hunt down passive voice, adverbs, repetitive sentence structures, and unnecessary words. Be harsh.",
        },
        {
            name: "The Beta Reader",
            role: "Focus: The Experience. You are a casual reader. Tell me where you got bored, where you got confused, or where the writing felt pretentious. Be honest about how it feels to read.",
        }
    ];

    // 2. Launch parallel requests for each member
    // Using gemini-2.5-flash for speed and efficiency for the individual members
    const memberPromises = councilMembers.map(async (member) => {
        const memberSystemInstruction = `${member.role}\n\n${projectContext}`;
        
        const payload = {
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { systemInstruction: memberSystemInstruction }
        };
        console.log(`Gemini Request Payload (runCouncil - ${member.name}):`, JSON.stringify(payload, null, 2));

        const response = await ai.models.generateContent(payload);
        return { name: member.name, response: response.text || "(No comment)" };
    });

    try {
        const memberResults = await Promise.all(memberPromises);

        // 3. Synthesize the results
        const synthesisPrompt = `
You are the Chairperson of the Writer's Council.
You have convened a meeting to discuss the user's query: "${prompt}"

Here are the opinions of your council members:

${memberResults.map(m => `**${m.name}**: ${m.response}`).join('\n\n')}

**Your Task:**
1. Present the individual opinions clearly (summarize them if they are too long, but keep the core points).
2. Synthesize these diverse viewpoints into a final, balanced verdict or actionable advice for the writer.
3. Identify key themes or disagreements (e.g. between style vs. clarity) and help the writer decide which path serves the story best.

Format the output nicely with Markdown, using headings for each member and the final verdict.
        `;

        // Using gemini-3-pro-preview for the final synthesis to provide high-quality reasoning
        const chairPayload = {
            model: 'gemini-3-pro-preview',
            contents: synthesisPrompt,
            config: { 
                systemInstruction: "You are the wise Chairperson of a Writer's Council.",
                // thinkingConfig removed to resolve invalid argument errors
            }
        };
        console.log("Gemini Request Payload (runCouncil - Chairperson):", JSON.stringify(chairPayload, null, 2));

        const chairResponse = await ai.models.generateContent(chairPayload);

        return chairResponse.text || "The Chairperson remained silent.";

    } catch (error) {
        console.error("Error running the Council:", error);
        throw new Error("The Council could not convene due to a network error.");
    }
};


// Ensure the service object matches the AiService interface
export const geminiService: AiService = {
    generateInitialProjectData,
    getAIResponse,
    getConsistencyCheckResponse,
    getReadingLevel,
    cleanUpText,
    generateCharacterImage,
    generateIllustrationForSection,
    getGraphAnalysis,
    runCouncil,
};