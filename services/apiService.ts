import { Project } from '../types';
import { getSavedProjects, saveProjects } from './storageService';

// Simulate network latency
const API_LATENCY = 400;

// Simulate a database API using localStorage via storageService
// In a real app, these functions would make fetch() calls to a backend.

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
        setTimeout(() => {
            saveProjects(projects);
            console.log("API: All projects saved.");
            resolve();
        }, API_LATENCY);
    });
};

export const createProject = async (project: Project): Promise<Project> => {
    console.log("API: Creating new project...", project);
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (!project.title) {
                return reject(new Error("Project title is required."));
            }
            const projects = getSavedProjects();
            const updatedProjects = [...projects, project];
            saveProjects(updatedProjects);
            console.log("API: Project created.", project);
            resolve(project);
        }, API_LATENCY);
    });
};

export const updateProject = async (updatedProject: Project): Promise<Project> => {
    console.log("API: Updating project...", updatedProject.id);
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const projects = getSavedProjects();
            const projectIndex = projects.findIndex(p => p.id === updatedProject.id);

            if (projectIndex === -1) {
                return reject(new Error("Project not found."));
            }

            const updatedProjects = [...projects];
            updatedProjects[projectIndex] = updatedProject;
            saveProjects(updatedProjects);
            resolve(updatedProject);
        }, API_LATENCY);
    });
};

export const deleteProject = async (projectId: string): Promise<{ success: boolean }> => {
    console.log("API: Deleting project...", projectId);
    return new Promise(resolve => {
        setTimeout(() => {
            let projects = getSavedProjects();
            projects = projects.filter(p => p.id !== projectId);
            saveProjects(projects);
            console.log("API: Project deleted.");
            resolve({ success: true });
        }, API_LATENCY);
    });
};