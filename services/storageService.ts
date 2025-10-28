import { Project } from '../types';

const STORAGE_KEY = 'ai-writing-assistant-projects';

export const getSavedProjects = (): Project[] => {
    try {
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (savedData) {
            // A simple validation to ensure it's an array
            const parsedData = JSON.parse(savedData);
            if (Array.isArray(parsedData)) {
                return parsedData;
            }
        }
    } catch (error) {
        console.error("Failed to load or parse projects from local storage:", error);
        // Clear corrupted data
        localStorage.removeItem(STORAGE_KEY);
    }
    return [];
};

export const saveProjects = (projects: Project[]): void => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    } catch (error) {
        console.error("Failed to save projects to local storage:", error);
    }
};