
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
    description: 'Adds a new character to the project, including their core identity details.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING, description: 'The name of the new character.' },
            description: { type: Type.STRING, description: 'A detailed description of the character.' },
            originStory: { type: Type.STRING, description: "The character's origin story and key formative events. Be creative." },
            familyMentors: { type: Type.STRING, description: "The character's family, mentors, enemies, and lovers. Be creative." },
            secretsRegrets: { type: Type.STRING, description: "The character's secrets, regrets, and turning points. Be creative." },
            relationshipsTimeline: { type: Type.STRING, description: "A timeline of the character's major relationships. Be creative." },
            aliases: { type: Type.STRING, description: "Aliases or titles for the character. Make a creative guess if not specified." },
            age: { type: Type.STRING, description: "The character's age, birthdate, or timeline notes. Make a reasonable guess." },
            gender: { type: Type.STRING, description: "The character's gender and/or pronouns. Make a reasonable guess." },
            species: { type: Type.STRING, description: "The character's species, race, or origin. Make a reasonable guess based on the project genre." },
            occupation: { type: Type.STRING, description: "The character's occupation, social role, or rank. Make a reasonable guess." },
            affiliations: { type: Type.STRING, description: "The character's affiliations with organizations, factions, or families. Make a reasonable guess." },
            heightBuild: { type: Type.STRING, description: "The character's height, build, posture, and movement style. Make a creative guess." },
            faceHairEyes: { type: Type.STRING, description: "The character's face, hair, eyes, and distinguishing features. Make a creative guess." },
            styleOutfit: { type: Type.STRING, description: "The character's typical style, outfit, and accessories. Make a creative guess." },
            vocalTraits: { type: Type.STRING, description: "The character's vocal traits and speech patterns. Make a creative guess." },
            healthAbilities: { type: Type.STRING, description: "The character's health, physical limitations, or special abilities. Make a creative guess." },
            coreMotivation: { type: Type.STRING, description: "The character's core motivation or primary desire that drives them every day. Be creative." },
            longTermGoal: { type: Type.STRING, description: "The character's long-term goal that they think will fulfill them. Be creative." },
            fearFlaw: { type: Type.STRING, description: "The character's primary fear, flaw, or blind spot. Be creative." },
            moralAlignment: { type: Type.STRING, description: "The character's moral alignment, values, or boundaries. Be creative." },
            temperament: { type: Type.STRING, description: "The character's temperament or personality type (e.g., MBTI, Enneagram, archetype). Be creative." },
            emotionalTriggers: { type: Type.STRING, description: "The character's emotional triggers, habits, or quirks. Be creative." },
            storyRole: { type: Type.STRING, description: "The character's story role or archetype (e.g., mentor, trickster, foil). Be creative." },
            introductionPoint: { type: Type.STRING, description: "Where the character first appears in the story. Be creative." },
            arcSummary: { type: Type.STRING, description: "A summary of the character's arc from beginning to end. Be creative." },
            conflictContribution: { type: Type.STRING, description: "How the character drives tension and conflict in the story. Be creative." },
            changeMetric: { type: Type.STRING, description: "The lesson the character learns or fails to learn. Be creative." },
            dictionSlangTone: { type: Type.STRING, description: "The character's diction, slang, and typical tone of voice. Be creative." },
            gesturesHabits: { type: Type.STRING, description: "The character's common gestures and physical habits. Be creative." },
            signaturePhrases: { type: Type.STRING, description: "The character's signature phrases or speech tics. Be creative." },
            internalThoughtStyle: { type: Type.STRING, description: "The style of the character's internal thoughts (e.g., pragmatic, poetic). Be creative." },
            homeEnvironmentInfluence: { type: Type.STRING, description: "How the character's home or environment shaped them. Be creative." },
            culturalReligiousBackground: { type: Type.STRING, description: "The character's cultural or religious background. Be creative." },
            economicPoliticalStatus: { type: Type.STRING, description: "The character's economic or political status in their world. Be creative." },
            technologyMagicInteraction: { type: Type.STRING, description: "How the character interacts with technology or magic. Be creative." },
            tiesToWorldEvents: { type: Type.STRING, description: "The character's ties to major world events. Be creative." },
            firstLastAppearance: { type: Type.STRING, description: "The character's first and last appearance in the story (e.g., chapter or scene). Be creative." },
            actorVisualReference: { type: Type.STRING, description: "An actor or visual reference for the character's appearance. Be creative." },
            symbolicObjectsThemes: { type: Type.STRING, description: "Symbolic objects or themes associated with the character. Be creative." },
            evolutionNotes: { type: Type.STRING, description: "Notes on the character's planned vs. realized arc evolution. Be creative." },
            crossLinks: { type: Type.STRING, description: "Links to other stories or timelines the character appears in. Be creative." },
            innerMonologueExample: { type: Type.STRING, description: "An example of the character's inner monologue. Be creative." },
            playlistSoundPalette: { type: Type.STRING, description: "A playlist or sound palette for the character. Be creative." },
            colorPaletteMotifs: { type: Type.STRING, description: "A color palette or symbolic motifs for the character. Be creative." },
            aiGameReference: { type: Type.STRING, description: "AI or game reference data for the character. Be creative." },
            developmentNotes: { type: Type.STRING, description: "Notes on how the character's concept changed over drafts. Be creative." },
        },
        required: [
            'name', 
            'description',
            'originStory',
            'familyMentors',
            'secretsRegrets',
            'relationshipsTimeline',
            'aliases',
            'age',
            'gender',
            'species',
            'occupation',
            'affiliations',
            'heightBuild',
            'faceHairEyes',
            'styleOutfit',
            'vocalTraits',
            'healthAbilities',
            'coreMotivation',
            'longTermGoal',
            'fearFlaw',
            'moralAlignment',
            'temperament',
            'emotionalTriggers',
            'storyRole',
            'introductionPoint',
            'arcSummary',
            'conflictContribution',
            'changeMetric',
            'dictionSlangTone',
            'gesturesHabits',
            'signaturePhrases',
            'internalThoughtStyle',
            'homeEnvironmentInfluence',
            'culturalReligiousBackground',
            'economicPoliticalStatus',
            'technologyMagicInteraction',
            'tiesToWorldEvents',
            'firstLastAppearance',
            'actorVisualReference',
            'symbolicObjectsThemes',
            'evolutionNotes',
            'crossLinks',
            'innerMonologueExample',
            'playlistSoundPalette',
            'colorPaletteMotifs',
            'aiGameReference',
            'developmentNotes'
        ],
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
            newOriginStory: { type: Type.STRING, description: "The character's new origin story." },
            newFamilyMentors: { type: Type.STRING, description: "The character's new family/mentors." },
            newSecretsRegrets: { type: Type.STRING, description: "The character's new secrets/regrets." },
            newRelationshipsTimeline: { type: Type.STRING, description: "The character's new relationships timeline." },
            newAliases: { type: Type.STRING, description: "The new aliases or titles for the character." },
            newAge: { type: Type.STRING, description: "The new age, birthdate, or timeline notes for the character." },
            newGender: { type: Type.STRING, description: "The new gender and/or pronouns for the character." },
            newSpecies: { type: Type.STRING, description: "The new species, race, or origin for the character." },
            newOccupation: { type: Type.STRING, description: "The new occupation, social role, or rank for the character." },
            newAffiliations: { type: Type.STRING, description: "The new affiliations for the character." },
            newHeightBuild: { type: Type.STRING, description: "The character's new height, build, posture, and movement style." },
            newFaceHairEyes: { type: Type.STRING, description: "The character's new face, hair, eyes, and distinguishing features." },
            newStyleOutfit: { type: Type.STRING, description: "The character's new typical style, outfit, and accessories." },
            newVocalTraits: { type: Type.STRING, description: "The character's new vocal traits and speech patterns." },
            newHealthAbilities: { type: Type.STRING, description: "The character's new health, physical limitations, or special abilities." },
            newCoreMotivation: { type: Type.STRING, description: "The character's new core motivation." },
            newLongTermGoal: { type: Type.STRING, description: "The character's new long-term goal." },
            newFearFlaw: { type: Type.STRING, description: "The character's new fear, flaw, or blind spot." },
            newMoralAlignment: { type: Type.STRING, description: "The character's new moral alignment or values." },
            newTemperament: { type: Type.STRING, description: "The character's new temperament or personality type." },
            newEmotionalTriggers: { type: Type.STRING, description: "The character's new emotional triggers, habits, or quirks." },
            newStoryRole: { type: Type.STRING, description: "The character's new story role or archetype." },
            newIntroductionPoint: { type: Type.STRING, description: "The character's new introduction point in the story." },
            newArcSummary: { type: Type.STRING, description: "The character's new arc summary." },
            newConflictContribution: { type: Type.STRING, description: "The character's new contribution to conflict." },
            newChangeMetric: { type: Type.STRING, description: "The new lesson the character learns or fails to learn." },
            newDictionSlangTone: { type: Type.STRING, description: "The character's new diction, slang, and tone." },
            newGesturesHabits: { type: Type.STRING, description: "The character's new gestures and habits." },
            newSignaturePhrases: { type: Type.STRING, description: "The character's new signature phrases." },
            newInternalThoughtStyle: { type: Type.STRING, description: "The character's new internal thought style." },
            newHomeEnvironmentInfluence: { type: Type.STRING, description: "The character's new home/environment influence." },
            newCulturalReligiousBackground: { type: Type.STRING, description: "The character's new cultural/religious background." },
            newEconomicPoliticalStatus: { type: Type.STRING, description: "The character's new economic/political status." },
            newTechnologyMagicInteraction: { type: Type.STRING, description: "The character's new interaction with technology or magic." },
            newTiesToWorldEvents: { type: Type.STRING, description: "The character's new ties to major world events." },
            newFirstLastAppearance: { type: Type.STRING, description: "The character's new first and last appearance." },
            newActorVisualReference: { type: Type.STRING, description: "The character's new actor/visual reference." },
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

    context += `\nPROJECT NOTES / SCRATCHPAD:\n`;
    context += `${project.notes || 'No notes yet.'}\n\n`;

    if (selectedItem) {
        context += `\nCURRENTLY VIEWING:\n`;
        if (selectedItem.type === 'character') {
            const char = selectedItem as Character;
            context += `Character: ${char.name} (ID: ${char.id})\n`;
            context += `\nCORE IDENTITY:\n`;
            if(char.aliases) context += `Aliases: ${char.aliases}\n`;
            if(char.age) context += `Age: ${char.age}\n`;
            if(char.gender) context += `Gender: ${char.gender}\n`;
            if(char.species) context += `Species: ${char.species}\n`;
            if(char.occupation) context += `Occupation: ${char.occupation}\n`;
            if(char.affiliations) context += `Affiliations: ${char.affiliations}\n`;
            context += `\nPHYSICAL DESCRIPTION:\n`;
            if(char.heightBuild) context += `Height/Build: ${char.heightBuild}\n`;
            if(char.faceHairEyes) context += `Face/Hair/Eyes: ${char.faceHairEyes}\n`;
            if(char.styleOutfit) context += `Style/Outfit: ${char.styleOutfit}\n`;
            if(char.vocalTraits) context += `Vocal Traits: ${char.vocalTraits}\n`;
            if(char.healthAbilities) context += `Health/Abilities: ${char.healthAbilities}\n`;
            context += `\PSYCHOLOGY & MOTIVATION:\n`;
            if(char.coreMotivation) context += `Core Motivation: ${char.coreMotivation}\n`;
            if(char.longTermGoal) context += `Long-Term Goal: ${char.longTermGoal}\n`;
            if(char.fearFlaw) context += `Fear/Flaw: ${char.fearFlaw}\n`;
            if(char.moralAlignment) context += `Moral Alignment: ${char.moralAlignment}\n`;
            if(char.temperament) context += `Temperament: ${char.temperament}\n`;
            if(char.emotionalTriggers) context += `Emotional Triggers: ${char.emotionalTriggers}\n`;
            context += `\nVOICE & BEHAVIOR:\n`;
            if(char.dictionSlangTone) context += `Diction/Slang/Tone: ${char.dictionSlangTone}\n`;
            if(char.gesturesHabits) context += `Common Gestures/Habits: ${char.gesturesHabits}\n`;
            if(char.signaturePhrases) context += `Signature Phrases: ${char.signaturePhrases}\n`;
            if(char.internalThoughtStyle) context += `Internal Thought Style: ${char.internalThoughtStyle}\n`;
            context += `\nDESCRIPTION: ${char.description}\n`;
            context += `\nBACKSTORY:\n`;
            if(char.originStory) context += `Origin Story: ${char.originStory}\n`;
            if(char.familyMentors) context += `Family/Mentors: ${char.familyMentors}\n`;
            if(char.secretsRegrets) context += `Secrets/Regrets: ${char.secretsRegrets}\n`;
            if(char.relationshipsTimeline) context += `Relationships Timeline: ${char.relationshipsTimeline}\n`;
            context += `\nNARRATIVE FUNCTION:\n`;
            if(char.storyRole) context += `Story Role: ${char.storyRole}\n`;
            if(char.introductionPoint) context += `Introduction Point: ${char.introductionPoint}\n`;
            if(char.arcSummary) context += `Arc Summary: ${char.arcSummary}\n`;
            if(char.conflictContribution) context += `Conflict Contribution: ${char.conflictContribution}\n`;
            if(char.changeMetric) context += `Change Metric: ${char.changeMetric}\n`;
            context += `\nCONTEXT & WORLD INTEGRATION:\n`;
            if(char.homeEnvironmentInfluence) context += `Home / Environment Influence: ${char.homeEnvironmentInfluence}\n`;
            if(char.culturalReligiousBackground) context += `Cultural / Religious Background: ${char.culturalReligiousBackground}\n`;
            if(char.economicPoliticalStatus) context += `Economic / Political Status: ${char.economicPoliticalStatus}\n`;
            if(char.technologyMagicInteraction) context += `Technology or Magic Interaction: ${char.technologyMagicInteraction}\n`;
            if(char.tiesToWorldEvents) context += `Ties to Major World Events: ${char.tiesToWorldEvents}\n`;
            context += `\nCONTINUITY AIDS:\n`;
            if(char.firstLastAppearance) context += `First & Last Appearance: ${char.firstLastAppearance}\n`;
            if(char.actorVisualReference) context += `Actor/Visual Reference: ${char.actorVisualReference}\n`;
            if(char.symbolicObjectsThemes) context += `Symbolic Objects/Themes: ${char.symbolicObjectsThemes}\n`;
            if(char.evolutionNotes) context += `Evolution Notes: ${char.evolutionNotes}\n`;
            if(char.crossLinks) context += `Cross-links: ${char.crossLinks}\n`;
            context += `\nOPTIONAL EXTRAS:\n`;
            if(char.innerMonologueExample) context += `Inner Monologue Example: ${char.innerMonologueExample}\n`;
            if(char.playlistSoundPalette) context += `Playlist/Sound Palette: ${char.playlistSoundPalette}\n`;
            if(char.colorPaletteMotifs) context += `Color Palette/Motifs: ${char.colorPaletteMotifs}\n`;
            if(char.aiGameReference) context += `AI/Game Reference Data: ${char.aiGameReference}\n`;
            if(char.developmentNotes) context += `Development Notes: ${char.developmentNotes}\n`;
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
        characterProfiles += `Name: ${char.name}\nDescription: ${char.description}\nOrigin Story: ${char.originStory || 'N/A'}\nFamily/Mentors/Enemies: ${char.familyMentors || 'N/A'}\nSecrets & Regrets: ${char.secretsRegrets || 'N/A'}\nStory Role: ${char.storyRole || 'N/A'}\nArc Summary: ${char.arcSummary || 'N/A'}\nDiction/Tone: ${char.dictionSlangTone || 'N/A'}\nHabits: ${char.gesturesHabits || 'N/A'}\nWorld Context: ${char.homeEnvironmentInfluence || 'N/A'}, ${char.economicPoliticalStatus || 'N/A'}\nContinuity Notes: ${char.evolutionNotes || 'N/A'}\nDevelopment Notes: ${char.developmentNotes || 'N/A'}\n---\n`;
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
Description: ${character.description}
Physical Appearance: ${character.faceHairEyes}, wearing ${character.styleOutfit}.`;

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

export const generateIllustrationForSection = async (section: OutlineSection, genre: string): Promise<string> => {
    if (!process.env.API_KEY) {
        throw new Error("AI is disabled. API key is missing.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `Generate a digital painting illustration for a scene from a ${genre}.
The scene is titled "${section.title}".
Scene description: ${section.content}
The style should be atmospheric, evocative, and cinematic, matching the genre. Do not include any text or titles in the image.`;

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
        console.error("Error generating illustration:", error);
        throw new Error("Sorry, I encountered an error while generating the illustration. Please try again.");
    }
};

export const generateInitialProjectData = async (
    title: string,
    genre: string,
    description: string
): Promise<{ outline: OutlineSection[], characters: Character[], notes: string }> => {
    if (!process.env.API_KEY) {
        throw new Error("AI is disabled. API key is missing.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const systemInstruction = `You are an expert story structure consultant and writer. Based on the provided project format and elevator pitch, generate a foundational story outline, a list of 2-3 key characters, and some initial notes/ideas.
The outline should follow common narrative structures relevant to the format (e.g., Three-Act Structure for a script, key chapters for a novel).
The characters should be compelling and fit the story's theme.
Return the data in the specified JSON format.`;

    const userPrompt = `
Project Title: ${title}
Format: ${genre}
Elevator Pitch: ${description}

Please generate the initial characters, outline, and notes for this project.
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
                        originStory: { type: Type.STRING, description: "The character's origin story and key formative events." },
                        familyMentors: { type: Type.STRING, description: "The character's family, mentors, enemies, and lovers." },
                        secretsRegrets: { type: Type.STRING, description: "The character's secrets, regrets, and turning points." },
                        relationshipsTimeline: { type: Type.STRING, description: "A timeline of the character's major relationships." },
                        aliases: { type: Type.STRING, description: "Aliases or titles for the character." },
                        age: { type: Type.STRING, description: "The character's age, birthdate, or timeline notes." },
                        gender: { type: Type.STRING, description: "The character's gender and/or pronouns." },
                        species: { type: Type.STRING, description: "The character's species, race, or origin." },
                        occupation: { type: Type.STRING, description: "The character's occupation, social role, or rank." },
                        affiliations: { type: Type.STRING, description: "The character's affiliations with organizations, factions, or families." },
                        heightBuild: { type: Type.STRING, description: "The character's height, build, posture, and movement style." },
                        faceHairEyes: { type: Type.STRING, description: "The character's face, hair, eyes, and distinguishing features." },
                        styleOutfit: { type: Type.STRING, description: "The character's typical style, outfit, and accessories." },
                        vocalTraits: { type: Type.STRING, description: "The character's vocal traits and speech patterns." },
                        healthAbilities: { type: Type.STRING, description: "The character's health, physical limitations, or special abilities." },
                        coreMotivation: { type: Type.STRING, description: "The character's core motivation or primary desire." },
                        longTermGoal: { type: Type.STRING, description: "The character's long-term goal." },
                        fearFlaw: { type: Type.STRING, description: "The character's primary fear, flaw, or blind spot." },
                        moralAlignment: { type: Type.STRING, description: "The character's moral alignment or values." },
                        temperament: { type: Type.STRING, description: "The character's temperament or personality type." },
                        emotionalTriggers: { type: Type.STRING, description: "The character's emotional triggers, habits, or quirks." },
                        storyRole: { type: Type.STRING, description: "The character's story role or archetype (e.g., mentor, trickster, foil)." },
                        introductionPoint: { type: Type.STRING, description: "Where the character first appears in the story." },
                        arcSummary: { type: Type.STRING, description: "A summary of the character's arc from beginning to end." },
                        conflictContribution: { type: Type.STRING, description: "How the character drives tension and conflict in the story." },
                        changeMetric: { type: Type.STRING, description: "The lesson the character learns or fails to learn." },
                        dictionSlangTone: { type: Type.STRING, description: "The character's diction, slang, and typical tone of voice." },
                        gesturesHabits: { type: Type.STRING, description: "The character's common gestures and physical habits." },
                        signaturePhrases: { type: Type.STRING, description: "The character's signature phrases or speech tics." },
                        internalThoughtStyle: { type: Type.STRING, description: "The style of the character's internal thoughts (e.g., pragmatic, poetic)." },
                        homeEnvironmentInfluence: { type: Type.STRING, description: "How the character's home or environment shaped them." },
                        culturalReligiousBackground: { type: Type.STRING, description: "The character's cultural or religious background." },
                        economicPoliticalStatus: { type: Type.STRING, description: "The character's economic or political status in their world." },
                        technologyMagicInteraction: { type: Type.STRING, description: "How the character interacts with technology or magic." },
                        tiesToWorldEvents: { type: Type.STRING, description: "The character's ties to major world events." },
                        firstLastAppearance: { type: Type.STRING, description: "The character's first and last appearance in the story (e.g., chapter or scene)." },
                        actorVisualReference: { type: Type.STRING, description: "An actor or visual reference for the character's appearance." },
                        symbolicObjectsThemes: { type: Type.STRING, description: "Symbolic objects or themes associated with the character." },
                        evolutionNotes: { type: Type.STRING, description: "Notes on the character's planned vs. realized arc evolution." },
                        crossLinks: { type: Type.STRING, description: "Links to other stories or timelines the character appears in." },
                        innerMonologueExample: { type: Type.STRING, description: "An example of the character's inner monologue." },
                        playlistSoundPalette: { type: Type.STRING, description: "A playlist or sound palette for the character." },
                        colorPaletteMotifs: { type: Type.STRING, description: "A color palette or symbolic motifs for the character." },
                        aiGameReference: { type: Type.STRING, description: "AI or game reference data for the character." },
                        developmentNotes: { type: Type.STRING, description: "Notes on how the character's concept changed over drafts." },
                    },
                    required: [
                        'name', 'description', 'originStory', 'familyMentors', 'secretsRegrets', 'relationshipsTimeline', 'aliases', 'age', 
                        'gender', 'species', 'occupation', 'affiliations', 'heightBuild', 
                        'faceHairEyes', 'styleOutfit', 'vocalTraits', 'healthAbilities',
                        'coreMotivation', 'longTermGoal', 'fearFlaw', 'moralAlignment',
                        'temperament', 'emotionalTriggers', 'storyRole', 'introductionPoint',
                        'arcSummary', 'conflictContribution', 'changeMetric', 'dictionSlangTone',
                        'gesturesHabits', 'signaturePhrases', 'internalThoughtStyle', 
                        'homeEnvironmentInfluence', 'culturalReligiousBackground', 'economicPoliticalStatus',
                        'technologyMagicInteraction', 'tiesToWorldEvents', 'firstLastAppearance',
                        'actorVisualReference', 'symbolicObjectsThemes', 'evolutionNotes', 'crossLinks',
                        'innerMonologueExample', 'playlistSoundPalette', 'colorPaletteMotifs',
                        'aiGameReference', 'developmentNotes'
                    ],
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
            notes: {
                type: Type.STRING,
                description: 'A brief section for unstructured notes or a scratchpad, possibly with initial ideas.'
            }
        },
        required: ['characters', 'outline', 'notes'],
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

        const notes = jsonResponse.notes || '';
        
        return { characters, outline, notes };

    } catch (error) {
        console.error("Error generating initial project data:", error);
        throw new Error("The AI failed to generate project data. It might be experiencing high traffic. Please try again.");
    }
};