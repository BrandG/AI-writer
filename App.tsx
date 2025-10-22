
import React, { useState } from 'react';
import { Project } from './types';
import { PROJECTS_DATA } from './constants';
import ProjectSelectionPage from './components/ProjectSelectionPage';
import WritingWorkspace from './components/WritingWorkspace';

const App: React.FC = () => {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
  };

  const handleGoBack = () => {
    setSelectedProject(null);
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      {selectedProject ? (
        <WritingWorkspace project={selectedProject} onBack={handleGoBack} />
      ) : (
        <ProjectSelectionPage projects={PROJECTS_DATA} onSelectProject={handleSelectProject} />
      )}
    </div>
  );
};

export default App;
