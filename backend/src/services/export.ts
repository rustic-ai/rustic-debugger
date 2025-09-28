import type { Message, MessageFilter } from '@rustic-debug/types';
import { MessageHistoryService } from './messageHistory/index.js';

export interface ExportOptions {
  format: 'json' | 'csv';
  includeMetadata?: boolean;
  includeRouting?: boolean;
  compressionFormat?: 'gzip' | 'none';
}

export class ExportService {
  private messageService = new MessageHistoryService();
  
  async exportMessages(
    filter: MessageFilter,
    options: ExportOptions
  ): Promise<{
    data: Buffer;
    mimeType: string;
    filename: string;
    size: number;
  }> {
    // Get messages
    const { messages } = await this.messageService.getMessageHistory(filter);
    
    let data: Buffer;
    let mimeType: string;
    let extension: string;
    
    switch (options.format) {
      case 'json':
        data = await this.exportAsJson(messages, options);
        mimeType = 'application/json';
        extension = 'json';
        break;
        
      case 'csv':
        data = await this.exportAsCsv(messages, options);
        mimeType = 'text/csv';
        extension = 'csv';
        break;
        
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
    
    // Apply compression if requested
    if (options.compressionFormat === 'gzip') {
      const { gzip } = await import('zlib');
      const { promisify } = await import('util');
      const gzipAsync = promisify(gzip);
      
      data = await gzipAsync(data);
      mimeType = 'application/gzip';
      extension = `${extension}.gz`;
    }
    
    const filename = `rustic-debug-export-${Date.now()}.${extension}`;
    
    return {
      data,
      mimeType,
      filename,
      size: data.length,
    };
  }
  
  private async exportAsJson(
    messages: Message[],
    options: ExportOptions
  ): Promise<Buffer> {
    const exportData = messages.map(message => {
      const base: any = {
        id: message.id.id,
        guildId: message.guildId,
        topicName: message.topicName,
        timestamp: message.metadata.timestamp.toISOString(),
        status: message.status.current,
        payload: message.payload,
      };
      
      if (options.includeMetadata) {
        base.metadata = message.metadata;
      }
      
      if (options.includeRouting) {
        base.routing = message.routing;
      }
      
      return base;
    });
    
    return Buffer.from(JSON.stringify(exportData, null, 2));
  }
  
  private async exportAsCsv(
    messages: Message[],
    options: ExportOptions
  ): Promise<Buffer> {
    const headers = [
      'MessageID',
      'GuildID',
      'TopicName',
      'Timestamp',
      'Status',
      'SourceAgent',
      'TargetAgent',
      'PayloadType',
      'PayloadSize',
    ];
    
    if (options.includeMetadata) {
      headers.push('Priority', 'RetryCount', 'TTL');
    }
    
    if (options.includeRouting) {
      headers.push('RoutingHops', 'Destination');
    }
    
    const rows = [headers.join(',')];
    
    for (const message of messages) {
      const payloadStr = JSON.stringify(message.payload.content);
      const row = [
        message.id.id,
        message.guildId,
        message.topicName,
        message.metadata.timestamp.toISOString(),
        message.status.current,
        message.metadata.sourceAgent,
        message.metadata.targetAgent || '',
        message.payload.type,
        payloadStr.length.toString(),
      ];
      
      if (options.includeMetadata) {
        row.push(
          message.metadata.priority.toString(),
          message.metadata.retryCount.toString(),
          message.metadata.ttl?.toString() || ''
        );
      }
      
      if (options.includeRouting) {
        row.push(
          message.routing.hops.length.toString(),
          message.routing.destination || ''
        );
      }
      
      rows.push(row.map(v => `"${v.replace(/"/g, '""')}"`).join(','));
    }
    
    return Buffer.from(rows.join('\n'));
  }
}