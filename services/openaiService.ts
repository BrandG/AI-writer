import OpenAI from "openai";
import { Project, ChatMessage, SelectableItem, OutlineSection, Character, UnifiedAIResponse, AiService, Note } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Define the tools (functions) the AI can call, in OpenAI's format
const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
    {
        type: 'function',
        function: {
            name: 'addOutlineSection',
            description: 'Adds a new section to the project outline. Can be a root section or a sub-section of an existing one.',
            parameters: {
                type: 'object',
                properties: {
                    title: { type: 'string', description: 'The title of the new section.' },
                    content: { type: 'string', description: 'Optional content for the new section.' },
                    parentId: { type: 'string', description: 'Optional ID of the parent section. If omitted, the section is added to the root.' },
                },
                required: ['title'],
            },
        }
    },
    {
        type: 'function',
        function: {
            name: 'updateOutlineSection',
            description: 'Updates an existing section in the project outline. Can update the title, content, or both.',
            parameters: {
                type: 'object',
                properties: {
                    sectionId: { type: 'string', description: 'The ID of the section to update.' },
                    newTitle: { type: 'string', description: 'The new title for the section.' },
                    newContent: { type: 'string', description: 'The new content for the section.' },
                },
                required: ['sectionId'],
            },
        }
    },
    {
        type: 'function',
        function: {
            name: 'deleteOutlineSection',
            description: 'Deletes an existing section from the project outline.',
            parameters: {
                type: 'object',
                properties: {
                    sectionId: { type: 'string', description: 'The ID of the section to delete.' },
                },
                required: ['sectionId'],
            },
        }
    },
    {
        type: 'function',
        function: {
            name: 'moveOutlineSection',
            description: 'Moves an existing section to a new position in the outline. Can be used to reorder sections or change their nesting level.',
            parameters: {
                type: 'object',
                properties: {
                    sectionId: { type: 'string', description: 'The ID of the section to move.' },
                    targetParentId: { type: 'string', description: 'Optional. The ID of the new parent section. If omitted and no sibling is specified, the section becomes a root item.' },
                    targetSiblingId: { type: 'string', description: 'Optional. The ID of an existing section to place the moved section next to.' },
                    position: { type: 'string', description: "Required if 'targetSiblingId' is provided. Can be 'before' or 'after'.", enum: ['before', 'after'] },
                },
                required: ['sectionId'],
            },
        }
    },
    {
        type: 'function',
        function: {
            name: 'addCharacter',
            description: 'Adds a new character to the project, including their core identity details.',
            parameters: {
                type: 'object',
                properties: {
                    name: { type: 'string', description: 'The name of the new character.' },
                    description: { type: 'string', description: 'A detailed description of the character.' },
                    originStory: { type: 'string', description: "The character's origin story and key formative events. Be creative." },
                    familyMentors: { type: 'string', description: "The character's family, mentors, enemies, and lovers. Be creative." },
                    secretsRegrets: { type: 'string', description: "The character's secrets, regrets, and turning points. Be creative." },
                    relationshipsTimeline: { type: 'string', description: "A timeline of the character's major relationships. Be creative." },
                    aliases: { type: 'string', description: "Aliases or titles for the character. Make a creative guess if not specified." },
                    age: { type: 'string', description: "The character's age, birthdate, or timeline notes. Make a reasonable guess." },
                    gender: { type: 'string', description: "The character's gender and/or pronouns. Make a reasonable guess." },
                    species: { type: 'string', description: "The character's species, race, or origin. Make a reasonable guess based on the project genre." },
                    occupation: { type: 'string', description: "The character's occupation, social role, or rank. Make a reasonable guess." },
                    affiliations: { type: 'string', description: "The character's affiliations with organizations, factions, or families. Make a reasonable guess." },
                    heightBuild: { type: 'string', description: "The character's height, build, posture, and movement style. Make a creative guess." },
                    faceHairEyes: { type: 'string', description: "The character's face, hair, eyes, and distinguishing features. Make a creative guess." },
                    styleOutfit: { type: 'string', description: "The character's typical style, outfit, and accessories. Make a creative guess." },
                    vocalTraits: { type: 'string', description: "The character's vocal traits and speech patterns. Make a creative guess." },
                    healthAbilities: { type: 'string', description: "The character's health, physical limitations, or special abilities. Make a creative guess." },
                    coreMotivation: { type: 'string', description: "The character's core motivation or primary desire that drives them every day. Be creative." },
                    longTermGoal: { type: 'string', description: "The character's long-term goal that they think will fulfill them. Be creative." },
                    fearFlaw: { type: 'string', description: "The character's primary fear, flaw, or blind spot. Be creative." },
                    moralAlignment: { type: 'string', description: "The character's moral alignment, values, or boundaries. Be creative." },
                    temperament: { type: 'string', description: "The character's temperament or personality type (e.g., MBTI, Enneagram, archetype). Be creative." },
                    emotionalTriggers: { type: 'string', description: "The character's emotional triggers, habits, or quirks. Be creative." },
                    storyRole: { type: 'string', description: "The character's story role or archetype (e.g., mentor, trickster, foil). Be creative." },
                    introductionPoint: { type: 'string', description: "Where the character first appears in the story. Be creative." },
                    arcSummary: { type: 'string', description: "A summary of the character's arc from beginning to end. Be creative." },
                    conflictContribution: { type: 'string', description: "How the character drives tension and conflict in the story. Be creative." },
                    changeMetric: { type: 'string', description: "The lesson the character learns or fails to learn. Be creative." },
                    dictionSlangTone: { type: 'string', description: "The character's diction, slang, and typical tone of voice. Be creative." },
                    gesturesHabits: { type: 'string', description: "The character's common gestures and physical habits. Be creative." },
                    signaturePhrases: { type: 'string', description: "The character's signature phrases or speech tics. Be creative." },
                    internalThoughtStyle: { type: 'string', description: "The style of the character's internal thoughts (e.g., pragmatic, poetic). Be creative." },
                    homeEnvironmentInfluence: { type: 'string', description: "How the character's home or environment shaped them. Be creative." },
                    culturalReligiousBackground: { type: 'string', description: "The character's cultural or religious background. Be creative." },
                    economicPoliticalStatus: { type: 'string', description: "The character's economic or political status in their world. Be creative." },
                    technologyMagicInteraction: { type: 'string', description: "How the character interacts with technology or magic. Be creative." },
                    tiesToWorldEvents: { type: 'string', description: "The character's ties to major world events. Be creative." },
                    firstLastAppearance: { type: 'string', description: "The character's first and last appearance in the story (e.g., chapter or scene). Be creative." },
                    actorVisualReference: { type: 'string', description: "An actor or visual reference for the character's appearance. Be creative." },
                    symbolicObjectsThemes: { type: 'string', description: "Symbolic objects or themes associated with the character. Be creative." },
                    evolutionNotes: { type: 'string', description: "Notes on the character's planned vs. realized arc evolution. Be creative." },
                    crossLinks: { type: 'string', description: "Links to other stories or timelines the character appears in. Be creative." },
                    innerMonologueExample: { type: 'string', description: "An example of the character's inner monologue. Be creative." },
                    playlistSoundPalette: { type: 'string', description: "A playlist or sound palette for the character. Be creative." },
                    colorPaletteMotifs: { type: 'string', description: "A color palette or symbolic motifs for the character. Be creative." },
                    aiGameReference: { type: 'string', description: "AI or game reference data for the character. Be creative." },
                    developmentNotes: { type: 'string', description: "Notes on how the character's concept changed over drafts. Be creative." },
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
            }
    },
    {
        type: 'function',
        function: {
            name: 'updateCharacter',
            description: 'Updates an existing character in the project.',
            parameters: {
                type: 'object',
                properties: {
                    characterId: { type: 'string', description: 'The ID of the character to update.' },
                    newName: { type: 'string', description: 'The new name for the character.' },
                    newDescription: { type: 'string', description: 'The new description for the character.' },
                    newOriginStory: { type: 'string', description: "The character's new origin story." },
                    newFamilyMentors: { type: 'string', description: "The character's new family/mentors." },
                    newSecretsRegrets: { type: 'string', description: "The character's new secrets/regrets." },
                    newRelationshipsTimeline: { type: 'string', description: "The character's new relationships timeline." },
                },
                required: ['characterId'],
            },
        }
    },
    {
        type: 'function',
        function: {
            name: 'deleteCharacter',
            description: 'Deletes an existing character from the project.',
            parameters: {
                type: 'object',
                properties: {
                    characterId: { type: 'string', description: 'The ID of the character to delete.' },
                },
                required: ['characterId'],
            },
        }
    }
];

// Helper functions for formatting context
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

// Main chat function
const getAIResponse = async (
    conversationHistory: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    project: Project,
    selectedItem: SelectableItem | null,
    systemInstruction: string
): Promise<UnifiedAIResponse> => {
    if (!process.env.OPENAI_API_KEY) {
        throw new Error("AI is disabled. OpenAI API key is missing.");
    }
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, dangerouslyAllowBrowser: true });

    const projectContext = formatProjectContext(project, selectedItem);
    const fullSystemInstruction = `${systemInstruction}\n\n${projectContext}`;

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: fullSystemInstruction },
        ...conversationHistory
    ];

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: messages,
            tools: tools,
            tool_choice: 'auto',
        });
        
        const message = response.choices[0].message;
        
        const toolCalls = message.tool_calls?.flatMap(tc => {
            if (tc.type === 'function') {
                return [{
                    id: tc.id,
                    function: {
                        name: tc.function.name,
                        arguments: tc.function.arguments,
                    }
                }];
            }
            return [];
        });

        return {
            text: message.content,
            toolCalls: toolCalls,
        };
    } catch (error) {
        console.error("Error fetching from OpenAI API:", error);
        throw new Error("Sorry, I encountered an error with the AI. Please try again.");
    }
};


// Consistency check function
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
    if (!process.env.OPENAI_API_KEY) {
        return "AI is disabled. OpenAI API key is missing.";
    }
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, dangerouslyAllowBrowser: true });

    const characterProfiles = characters.map(formatCharacterForConsistencyCheck).join('');

    const systemInstruction = `You are a meticulous continuity editor. Your task is to find physical contradictions in a story scene by cross-referencing it with provided character profiles.

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

Here are the character profiles:
${characterProfiles}

Here is the scene to analyze:
SECTION TITLE: ${section.title}
SCENE CONTENT:
${section.content}`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: systemInstruction },
                { role: 'user', content: "Please analyze the provided scene for physical inconsistencies based on your instructions. Re-read the scene multiple times if necessary to ensure no contradictions are missed." }
            ]
        });
        return response.choices[0].message.content || "No response from AI.";
    } catch (error) {
        console.error("Error fetching from OpenAI API for consistency check:", error);
        return "Sorry, I encountered an error during the consistency check. Please try again.";
    }
};

// Image generation functions
const generateCharacterImage = async (character: Character): Promise<string> => {
    if (!process.env.OPENAI_API_KEY) {
        throw new Error("AI is disabled. OpenAI API key is missing.");
    }
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, dangerouslyAllowBrowser: true });

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

    try {
        const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: prompt,
            n: 1,
            size: "1024x1024",
            response_format: 'b64_json',
        });
        
        const b64_json = response.data[0]?.b64_json;
        if (!b64_json) {
            throw new Error("No image data found in OpenAI response.");
        }
        return b64_json;

    } catch (error) {
        console.error("Error generating character image with OpenAI:", error);
        throw new Error("Sorry, I encountered an error while generating the image.");
    }
};

const generateIllustrationForSection = async (section: OutlineSection, genre: string): Promise<string> => {
     if (!process.env.OPENAI_API_KEY) {
        throw new Error("AI is disabled. OpenAI API key is missing.");
    }
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, dangerouslyAllowBrowser: true });

    const prompt = `Photorealistic image for a scene from a ${genre} story.
Scene Title: "${section.title}".
Scene Description: ${section.content}
Style: Cinematic photography, 8k resolution, highly detailed, realistic lighting matching the ${genre} genre. No text or titles in the image.`;

    try {
        const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: prompt,
            n: 1,
            size: "1792x1024", // Landscape aspect ratio
            quality: "standard",
            response_format: 'b64_json',
        });

        const b64_json = response.data[0]?.b64_json;
        if (!b64_json) {
            throw new Error("No image data found in OpenAI response.");
        }
        return b64_json;

    } catch (error) {
        console.error("Error generating illustration with OpenAI:", error);
        throw new Error("Sorry, I encountered an error while generating the illustration.");
    }
};


// Initial project generation function
const generateInitialProjectData = async (
    title: string,
    genre: string,
    description: string
): Promise<{ outline: OutlineSection[], characters: Character[], notes: Note[] }> => {
    if (!process.env.OPENAI_API_KEY) {
        throw new Error("AI is disabled. OpenAI API key is missing.");
    }
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, dangerouslyAllowBrowser: true });
    
    const systemInstruction = `You are an expert story structure consultant and writer. Based on the provided project pitch, generate a foundational story outline, a list of 2-3 key characters, and some initial notes.
The outline should follow a standard narrative structure (e.g., Three-Act Structure). The characters should be compelling.
**You must respond with a JSON object that contains 'characters', 'outline', and 'notes' keys.** The 'notes' key should contain an array of note objects, each with a 'title' and 'content'. The structure should match the user's request.`;
    
    const userPrompt = `
Project Title: ${title}
Format/Genre: ${genre}
Elevator Pitch: ${description}

Please generate the initial characters, outline, and notes for this project in the required JSON format.
For each character, please fill out all of the following fields, being as creative and detailed as possible: name, description, originStory, familyMentors, secretsRegrets, relationshipsTimeline, aliases, age, gender, species, occupation, affiliations, heightBuild, faceHairEyes, styleOutfit, vocalTraits, healthAbilities, coreMotivation, longTermGoal, fearFlaw, moralAlignment, temperament, emotionalTriggers, storyRole, introductionPoint, arcSummary, conflictContribution, changeMetric, dictionSlangTone, gesturesHabits, signaturePhrases, internalThoughtStyle, homeEnvironmentInfluence, culturalReligiousBackground, economicPoliticalStatus, technologyMagicInteraction, tiesToWorldEvents, firstLastAppearance, actorVisualReference, symbolicObjectsThemes, evolutionNotes, crossLinks, innerMonologueExample, playlistSoundPalette, colorPaletteMotifs, aiGameReference, developmentNotes.
`;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: systemInstruction },
                { role: "user", content: userPrompt },
            ],
            response_format: { type: "json_object" },
        });

        const content = response.choices[0].message.content;
        if (!content) {
            throw new Error("AI returned an empty response.");
        }

        const jsonResponse = JSON.parse(content);

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
        
        const notes = jsonResponse.notes.map((note: Omit<Note, 'id' | 'type'>) => ({
            ...note,
            id: uuidv4(),
            type: 'note' as const,
        }));
        
        return { characters, outline, notes: notes || [] };

    } catch (error) {
        console.error("Error generating initial project data with OpenAI:", error);
        throw new Error("The AI failed to generate project data. It might be experiencing high traffic. Please try again.");
    }
};

export const openaiService: AiService = {
    generateInitialProjectData,
    getAIResponse,
    getConsistencyCheckResponse,
    generateCharacterImage,
    generateIllustrationForSection,
};