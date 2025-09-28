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
        id: message.id,
        timestamp: new Date(message.timestamp).toISOString(),
        format: message.format,
        topics: message.topics,
        sender: message.sender,
        payload: message.payload,
        is_error_message: message.is_error_message,
        process_status: message.process_status,
      };

      if (options.includeMetadata) {
        base.priority = message.priority;
        base.recipient_list = message.recipient_list;
        base.thread = message.thread;
        base.in_response_to = message.in_response_to;
        base.conversation_id = message.conversation_id;
        base.ttl = message.ttl;
      }

      if (options.includeRouting) {
        base.routing_slip = message.routing_slip;
        base.forward_header = message.forward_header;
        base.message_history = message.message_history;
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
      const payloadStr = JSON.stringify(message.payload);
      const row = [
        message.id.toString(),
        typeof message.topics === 'string' ? message.topics : message.topics.join(';'),
        message.topic_published_to || '',
        new Date(message.timestamp).toISOString(),
        message.process_status || (message.is_error_message ? 'error' : 'completed'),
        message.sender.name || message.sender.id || 'unknown',
        message.recipient_list?.map(r => r.name || r.id).join(';') || '',
        message.format,
        payloadStr.length.toString(),
      ];

      if (options.includeMetadata) {
        row.push(
          message.priority.toString(),
          message.thread?.length.toString() || '0',
          message.ttl?.toString() || ''
        );
      }

      if (options.includeRouting) {
        row.push(
          message.message_history?.length.toString() || '0',
          message.forward_header?.on_behalf_of?.name || ''
        );
      }
      
      rows.push(row.map(v => `"${v.replace(/"/g, '""')}"`).join(','));
    }
    
    return Buffer.from(rows.join('\n'));
  }
}