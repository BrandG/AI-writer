
import React from 'react';
import { Project } from '../types';

interface ProjectSelectionPageProps {
  projects: Project[];
  onSelectProject: (project: Project) => void;
}

const ProjectCard: React.FC<{ project: Project; onSelect: () => void }> = ({ project, onSelect }) => (
  <div className="bg-gray-800 rounded-lg shadow-lg p-6 flex flex-col hover:bg-gray-700 transition-colors duration-200 transform hover:-translate-y-1">
    <h3 className="text-xl font-bold text-cyan-400 mb-2">{project.title}</h3>
    <p className="text-sm font-semibold text-gray-400 mb-4">{project.genre}</p>
    <p className="text-gray-300 flex-grow mb-6">{project.description}</p>
    <button
      onClick={onSelect}
      className="mt-auto bg-cyan-600 text-white font-bold py-2 px-4 rounded-md hover:bg-cyan-500 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-opacity-75"
    >
      Open Project
    </button>
  </div>
);

const ProjectSelectionPage: React.FC<ProjectSelectionPageProps> = ({ projects, onSelectProject }) => {
  return (
    <div className="container mx-auto p-8">
      <header className="text-center mb-12">
        <h1 className="text-5xl font-extrabold text-white mb-2">AI Writing Assistant</h1>
        <p className="text-lg text-gray-400">Choose a project to begin your creative journey.</p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} onSelect={() => onSelectProject(project)} />
        ))}
      </div>
    </div>
  );
};

export default ProjectSelectionPage;
