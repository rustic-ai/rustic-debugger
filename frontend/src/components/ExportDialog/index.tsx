import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@services/api/client';
import { useGuildStore } from '@stores/guildStore';
import { useFilterStore } from '@stores/filterStore';
import type { ExportFormat } from '@rustic-debug/types';
import { Download, X, FileJson, FileText, Archive } from 'lucide-react';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExportDialog({ isOpen, onClose }: ExportDialogProps) {
  const { selectedGuildId, selectedTopicName } = useGuildStore();
  const filters = useFilterStore();
  const [format, setFormat] = useState<ExportFormat>('json');
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [includeErrors, setIncludeErrors] = useState(true);
  const [dateRange, setDateRange] = useState<{
    start: string;
    end: string;
  }>({
    start: filters.timeRange.start?.toISOString().slice(0, 16) || '',
    end: filters.timeRange.end?.toISOString().slice(0, 16) || '',
  });
  
  const exportMutation = useMutation({
    mutationFn: async () => {
      if (!selectedGuildId) throw new Error('No guild selected');
      
      const filter: any = {
        guildId: selectedGuildId,
      };
      
      if (selectedTopicName) {
        filter.topicName = selectedTopicName;
      }
      
      if (dateRange.start || dateRange.end) {
        filter.timeRange = {
          start: dateRange.start ? new Date(dateRange.start) : undefined,
          end: dateRange.end ? new Date(dateRange.end) : undefined,
        };
      }
      
      if (filters.statusFilter?.length) {
        filter.status = filters.statusFilter;
      }
      
      const response = await apiClient.exportMessages({
        filter,
        format,
        includeMetadata,
        includeRouting: includeErrors,
      });
      
      // Create download link
      const blob = new Blob([JSON.stringify(response, null, 2)], {
        type: format === 'json' ? 'application/json' : 'text/csv',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `messages-${selectedGuildId}-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      return response;
    },
    onSuccess: () => {
      setTimeout(() => {
        onClose();
      }, 1500);
    },
  });
  
  if (!isOpen) return null;
  
  const formatOptions = [
    { value: 'json', label: 'JSON', icon: FileJson },
    { value: 'csv', label: 'CSV', icon: FileText },
    { value: 'ndjson', label: 'NDJSON', icon: Archive },
  ] as const;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-card border rounded-lg shadow-lg">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold text-lg">Export Messages</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          {/* Export Format */}
          <div>
            <label className="text-sm font-medium mb-2 block">Export Format</label>
            <div className="grid grid-cols-3 gap-2">
              {formatOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => setFormat(option.value as ExportFormat)}
                    className={`p-3 border rounded-md flex flex-col items-center space-y-1 transition-colors ${
                      format === option.value
                        ? 'border-primary bg-primary/10'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Date Range */}
          <div>
            <label className="text-sm font-medium mb-2 block">Date Range</label>
            <div className="space-y-2">
              <input
                type="datetime-local"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="w-full px-3 py-2 border rounded-md bg-background"
                placeholder="Start date"
              />
              <input
                type="datetime-local"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="w-full px-3 py-2 border rounded-md bg-background"
                placeholder="End date"
              />
            </div>
          </div>
          
          {/* Options */}
          <div className="space-y-3">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={includeMetadata}
                onChange={(e) => setIncludeMetadata(e.target.checked)}
                className="rounded border-input"
              />
              <span className="text-sm">Include message metadata</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={includeErrors}
                onChange={(e) => setIncludeErrors(e.target.checked)}
                className="rounded border-input"
              />
              <span className="text-sm">Include error details</span>
            </label>
          </div>
          
          {/* Export Info */}
          <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground">
            <p>Export will include:</p>
            <ul className="list-disc list-inside mt-1 space-y-0.5">
              <li>Guild: {selectedGuildId || 'All'}</li>
              {selectedTopicName && <li>Topic: {selectedTopicName}</li>}
              {filters.statusFilter?.length ? (
                <li>Status filter: {filters.statusFilter.join(', ')}</li>
              ) : null}
            </ul>
          </div>
        </div>
        
        <div className="p-4 border-t flex items-center justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-md hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending || exportMutation.isSuccess}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>
              {exportMutation.isPending
                ? 'Exporting...'
                : exportMutation.isSuccess
                ? 'Downloaded!'
                : 'Export'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}