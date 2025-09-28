import { useState } from 'react';
import { GuildExplorer } from '@components/GuildExplorer';
import { MessageFlow } from '@components/MessageFlow';
import { MessageInspector } from '@components/MessageInspector';
import { MessageList } from '@components/MessageList';
import { FilterPanel } from '@components/FilterPanel';
import { ThreadView } from '@components/ThreadView';
import { ExportDialog } from '@components/ExportDialog';
import { DeveloperPresence } from '@components/DeveloperPresence';
import { useGuildSubscription, useTopicSubscription } from '@hooks';
import { useGuildStore } from '@stores/guildStore';
import { useMediaQuery } from '@hooks/useMediaQuery';
import { Download, PanelLeftClose, PanelRightClose } from 'lucide-react';

export function Debug() {
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [activeView, setActiveView] = useState<'flow' | 'list' | 'thread'>('flow');
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const { selectedGuildId, selectedTopicName } = useGuildStore();
  const isDesktop = useMediaQuery('(min-width: 1280px)');
  
  // Subscribe to WebSocket updates
  useGuildSubscription(selectedGuildId);
  useTopicSubscription(selectedGuildId, selectedTopicName);
  
  return (
    <div className="h-full flex flex-col -m-6">
      {/* Sub-header with view controls */}
      <div className="border-b px-6 py-3 bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <nav className="flex items-center space-x-1">
              <button
                onClick={() => setActiveView('flow')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeView === 'flow' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-muted'
                }`}
              >
                Flow View
              </button>
              <button
                onClick={() => setActiveView('list')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeView === 'list' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-muted'
                }`}
              >
                List View
              </button>
              <button
                onClick={() => setActiveView('thread')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeView === 'thread' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-muted'
                }`}
              >
                Thread View
              </button>
            </nav>
          </div>
          
          <div className="flex items-center space-x-3">
            <DeveloperPresence />
            <FilterPanel />
            <button
              onClick={() => setShowExportDialog(true)}
              className="flex items-center space-x-2 px-3 py-2 border rounded-md hover:bg-muted text-sm"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Panel Toggle Buttons */}
        {!isDesktop && (
          <>
            <button
              onClick={() => setShowLeftPanel(!showLeftPanel)}
              className="absolute left-2 top-2 z-10 p-2 bg-card border rounded-md shadow-sm xl:hidden"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowRightPanel(!showRightPanel)}
              className="absolute right-2 top-2 z-10 p-2 bg-card border rounded-md shadow-sm xl:hidden"
            >
              <PanelRightClose className="w-4 h-4" />
            </button>
          </>
        )}
        
        {/* Left Panel - Guild Explorer */}
        <aside className={`
          ${isDesktop ? 'w-80' : 'absolute inset-y-0 left-0 w-80 z-20'}
          ${!isDesktop && !showLeftPanel ? '-translate-x-full' : ''}
          transition-transform duration-300
          border-r bg-card overflow-y-auto
        `}>
          <GuildExplorer />
        </aside>
        
        {/* Center Panel - Main View */}
        <main className="flex-1 bg-background overflow-hidden">
          {activeView === 'flow' && <MessageFlow />}
          {activeView === 'list' && <MessageList />}
          {activeView === 'thread' && <ThreadView />}
        </main>
        
        {/* Right Panel - Message Inspector */}
        <aside className={`
          ${isDesktop ? 'w-[400px]' : 'absolute inset-y-0 right-0 w-full max-w-md z-20'}
          ${!isDesktop && !showRightPanel ? 'translate-x-full' : ''}
          transition-transform duration-300
          border-l bg-card overflow-y-auto
        `}>
          <MessageInspector />
        </aside>
      </div>
      
      {/* Dialogs */}
      <ExportDialog 
        isOpen={showExportDialog} 
        onClose={() => setShowExportDialog(false)} 
      />
    </div>
  );
}