import OpenAI from "openai";

export interface Character {
  id: string;
  name: string;
  description: string;
  type: 'character';
  imageUrl?: string;
  aliases?: string;
  age?: string;
  gender?: string;
  species?: string;
  occupation?: string;
  affiliations?: string;
  heightBuild?: string;
  faceHairEyes?: string;
  styleOutfit?: string;
  vocalTraits?: string;
  healthAbilities?: string;
  coreMotivation?: string;
  longTermGoal?: string;
  fearFlaw?: string;
  moralAlignment?: string;
  temperament?: string;
  emotionalTriggers?: string;
  originStory?: string;
  familyMentors?: string;
  secretsRegrets?: string;
  relationshipsTimeline?: string;
  storyRole?: string;
  introductionPoint?: string;
  arcSummary?: string;
  conflictContribution?: string;
  changeMetric?: string;
  dictionSlangTone?: string;
  gesturesHabits?: string;
  signaturePhrases?: string;
  internalThoughtStyle?: string;
  homeEnvironmentInfluence?: string;
  culturalReligiousBackground?: string;
  economicPoliticalStatus?: string;
  technologyMagicInteraction?: string;
  tiesToWorldEvents?: string;
  firstLastAppearance?: string;
  actorVisualReference?: string;
  symbolicObjectsThemes?: string;
  evolutionNotes?: string;
  crossLinks?: string;
  innerMonologueExample?: string;
  playlistSoundPalette?: string;
  colorPaletteMotifs?: string;
  aiGameReference?: string;
  developmentNotes?: string;
  exportConfig?: { [key: string]: boolean };
}

export interface OutlineSection {
  id: string;
  title: string;
  content: string;
  type: 'outline';
  children?: OutlineSection[];
  characterIds?: string[];
  imageUrl?: string;
  includeInExport?: boolean;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  type: 'note';
}

export interface Task {
  id: string;
  text: string;
  isCompleted: boolean;
}

export interface TaskList {
  id: string;
  title: string;
  tasks: Task[];
  type: 'taskList';
}

export interface Project {
  id: string;
  title: string;
  genre: string;
  description: string;
  outline: OutlineSection[];
  characters: Character[];
  notes: Note[];
  taskLists: TaskList[];
}

export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

export type SelectableItem = Character | OutlineSection | Note | TaskList;

export type AiProvider = 'openai' | 'gemini';
export type AiPersonality = 'assistant' | 'muse' | 'editor' | 'peer' | 'oracle';

export interface UnifiedAIResponse {
    text: string | null;
    toolCalls?: {
        id: string;
        function: {
            name: string;
            arguments: string; // JSON string
        };
    }[];
}

export interface AiService {
    generateInitialProjectData: (title: string, genre: string, description: string) => Promise<{ outline: OutlineSection[], characters: Character[], notes: Note[] }>;
    getAIResponse: (
        conversationHistory: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
        project: Project,
        selectedItem: SelectableItem | null,
        systemInstruction: string
    ) => Promise<UnifiedAIResponse>;
    getConsistencyCheckResponse: (section: OutlineSection, characters: Character[]) => Promise<string>;
    getReadingLevel: (text: string) => Promise<string>;
    cleanUpText: (text: string) => Promise<string>;
    generateCharacterImage: (character: Character) => Promise<string>;
    generateIllustrationForSection: (section: OutlineSection, genre: string) => Promise<string>;
}