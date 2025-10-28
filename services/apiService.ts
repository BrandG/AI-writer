import { Project, Character, OutlineSection } from '../types';
import { getSavedProjects, saveProjects } from './storageService';
import { saveImage, deleteImage } from './imageDbService';

// Simulate network latency
const API_LATENCY = 400;

// Simulate a database API using localStorage via storageService
// In a real app, these functions would make fetch() calls to a backend.

const getImageKey = (item: Character | OutlineSection) => `image-${item.id}`;

// New helper to process a single project: extract images, save them to IndexedDB, and replace with keys
const processProjectForSaving = async (project: Project): Promise<Project> => {
    const projectCopy = JSON.parse(JSON.stringify(project));

    const imagePromises: Promise<void>[] = [];

    // Process characters
    for (const character of projectCopy.characters) {
        // A fresh image is a raw b64 string. A saved one is a key.
        // A key starts with 'image-'. If it doesn't, it's a new image to be saved.
        if (character.imageUrl && !character.imageUrl.startsWith('image-')) {
            const key = getImageKey(character);
            imagePromises.push(saveImage(key, character.imageUrl));
            character.imageUrl = key;
        }
    }

    // Process outline sections recursively
    const processOutline = (sections: OutlineSection[]) => {
        for (const section of sections) {
            if (section.imageUrl && !section.imageUrl.startsWith('image-')) {
                const key = getImageKey(section);
                imagePromises.push(saveImage(key, section.imageUrl));
                section.imageUrl = key;
            }
            if (section.children) {
                processOutline(section.children);
            }
        }
    };
    processOutline(projectCopy.outline);

    await Promise.all(imagePromises);
    return projectCopy;
};

// New helper to delete all images associated with a project
const deleteProjectImages = async (project: Project): Promise<void> => {
    const imageDeletionPromises: Promise<void>[] = [];
    
    // Delete character images
    project.characters.forEach(character => {
        if (character.imageUrl && character.imageUrl.startsWith('image-')) {
            imageDeletionPromises.push(deleteImage(character.imageUrl));
        }
    });

    // Delete outline images recursively
    const findAndDeleteImages = (sections: OutlineSection[]) => {
        sections.forEach(section => {
            if (section.imageUrl && section.imageUrl.startsWith('image-')) {
                imageDeletionPromises.push(deleteImage(section.imageUrl));
            }
            if (section.children) {
                findAndDeleteImages(section.children);
            }
        });
    };
    findAndDeleteImages(project.outline);
    
    await Promise.all(imageDeletionPromises);
};

export const getAllProjects = async (): Promise<Project[]> => {
    console.log("API: Fetching all projects...");
    return new Promise(resolve => {
        setTimeout(() => {
            const projects = getSavedProjects();
            console.log("API: Fetched projects.", projects);
            resolve(projects);
        }, API_LATENCY);
    });
};

export const setAllProjects = async (projects: Project[]): Promise<void> => {
    console.log("API: Setting all projects...");
    return new Promise(resolve => {
        setTimeout(async () => {
            // Process all projects to store images separately
            const processedProjects = await Promise.all(projects.map(p => processProjectForSaving(p)));
            saveProjects(processedProjects);
            console.log("API: All projects metadata saved.");
            resolve();
        }, API_LATENCY);
    });
};

export const createProject = async (project: Project): Promise<Project> => {
    console.log("API: Creating new project...", project);
    return new Promise((resolve, reject) => {
        setTimeout(async () => {
            if (!project.title) {
                return reject(new Error("Project title is required."));
            }
            const processedProject = await processProjectForSaving(project);
            const projects = getSavedProjects();
            const updatedProjects = [...projects, processedProject];
            saveProjects(updatedProjects);
            console.log("API: Project created.", project);
            resolve(project);
        }, API_LATENCY);
    });
};

export const updateProject = async (updatedProject: Project): Promise<Project> => {
    console.log("API: Updating project...", updatedProject.id);
    return new Promise((resolve, reject) => {
        setTimeout(async () => {
            const projects = getSavedProjects();
            const projectIndex = projects.findIndex(p => p.id === updatedProject.id);

            if (projectIndex === -1) {
                return reject(new Error("Project not found."));
            }

            const processedProject = await processProjectForSaving(updatedProject);
            const updatedProjects = [...projects];
            updatedProjects[projectIndex] = processedProject;
            saveProjects(updatedProjects);
            resolve(updatedProject);
        }, API_LATENCY);
    });
};

export const deleteProject = async (projectId: string): Promise<{ success: boolean }> => {
    console.log("API: Deleting project...", projectId);
    return new Promise(resolve => {
        setTimeout(async () => {
            let projects = getSavedProjects();
            const projectToDelete = projects.find(p => p.id === projectId);
            
            if (projectToDelete) {
                await deleteProjectImages(projectToDelete);
            }

            projects = projects.filter(p => p.id !== projectId);
            saveProjects(projects);
            console.log("API: Project deleted.");
            resolve({ success: true });
        }, API_LATENCY);
    });
};