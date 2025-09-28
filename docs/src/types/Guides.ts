import { DocumentationPage, NavigationPageRef } from './DocumentationPage';

export interface UserGuide {
  // Organization
  id: string;                    // Unique identifier
  title: string;                 // Guide section title
  description: string;           // What this guide covers

  // Content structure
  pages: DocumentationPage[];    // Ordered list of pages in this guide
  workflows: UserWorkflow[];     // Step-by-step user workflows

  // Navigation
  order: number;                 // Display order in main navigation
  icon?: string;                 // Optional icon for navigation

  // Metrics
  completeness: number;          // Percentage of features covered (0-100)
  lastUpdate: Date;              // Last content update

  // Target audience
  userLevel: 'beginner' | 'intermediate' | 'advanced';
  prerequisites?: string[];      // Required knowledge or setup
}

export interface DeveloperGuide {
  // Organization
  id: string;                    // Unique identifier
  title: string;                 // Guide section title
  description: string;           // What this guide covers

  // Content structure
  pages: DocumentationPage[];    // Ordered list of pages in this guide
  apiReferences: APIReference[]; // API documentation sections
  codeExamples: CodeExample[];   // Reusable code examples

  // Navigation
  order: number;                 // Display order in main navigation
  icon?: string;                 // Optional icon for navigation

  // Technical context
  technologies: string[];        // Technologies covered
  difficulty: 'basic' | 'intermediate' | 'advanced';
  estimatedTime?: number;        // Time to complete in hours

  // Dependencies
  prerequisites: string[];       // Required setup or knowledge
  relatedGuides: string[];       // Links to related dev guides
}

export interface UserWorkflow {
  id: string;                    // Unique workflow identifier
  title: string;                 // Workflow name
  description: string;           // What this workflow accomplishes

  // Structure
  steps: WorkflowStep[];         // Sequential steps
  branches?: WorkflowBranch[];   // Alternative paths

  // Context
  userLevel: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number;         // Time to complete in minutes

  // Associated content
  pages: string[];               // Related documentation page IDs
  screenshots: string[];         // Associated screenshot IDs

  // Validation
  successCriteria: string[];     // How to know the workflow succeeded
  troubleshooting: TroubleshootingItem[];
}

export interface WorkflowStep {
  id: string;                    // Step identifier
  title: string;                 // Step name
  description: string;           // What to do

  // Instructions
  actions: WorkflowAction[];     // Specific actions to take
  expectedResult: string;        // What should happen

  // Assets
  screenshot?: string;           // Screenshot ID for this step
  codeExample?: string;          // Code example ID

  // Navigation
  nextStep?: string;             // Next step ID
  alternativeSteps?: string[];   // Alternative next steps

  // Validation
  validation?: StepValidation;   // How to verify completion
}

export interface WorkflowAction {
  type: 'click' | 'type' | 'navigate' | 'wait' | 'verify';
  target?: string;               // Element selector or description
  value?: string;                // Value to enter or verify
  description: string;           // Human-readable instruction
}

export interface WorkflowBranch {
  id: string;                    // Branch identifier
  condition: string;             // When to take this branch
  description: string;           // Description of the branch
  steps: string[];               // Step IDs in this branch
  mergePoint?: string;           // Step ID where branches merge
}

export interface StepValidation {
  type: 'visual' | 'text' | 'element' | 'url';
  criteria: string;              // What to validate
  expectedValue?: string;        // Expected result
}

export interface TroubleshootingItem {
  problem: string;               // Description of the issue
  symptoms: string[];            // How to recognize the issue
  solutions: string[];           // Possible solutions
  relatedSteps: string[];        // Related workflow step IDs
}

export interface APIReference {
  id: string;                    // Unique identifier
  title: string;                 // API section title
  description: string;           // What this API covers

  // Structure
  endpoints: APIEndpoint[];      // Available endpoints
  schemas: APISchema[];          // Data structures
  examples: APIExample[];        // Usage examples

  // Metadata
  version: string;               // API version
  baseUrl: string;               // Base URL for the API
  authentication: APIAuth;       // Authentication requirements

  // Documentation
  changeLog: APIChangeLogEntry[];// Version history
  deprecations: APIDeprecation[];// Deprecated features
}

export interface APIEndpoint {
  id: string;                    // Endpoint identifier
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;                  // Endpoint path
  summary: string;               // Brief description
  description: string;           // Detailed description

  // Parameters
  pathParameters: APIParameter[];
  queryParameters: APIParameter[];
  bodySchema?: string;           // Schema ID for request body

  // Responses
  responses: APIResponse[];

  // Examples
  examples: APIExample[];

  // Metadata
  tags: string[];                // Categorization tags
  deprecated?: boolean;
  since?: string;                // Version introduced
}

export interface APIParameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
  example?: any;
  defaultValue?: any;
}

export interface APIResponse {
  statusCode: number;
  description: string;
  schema?: string;               // Schema ID for response body
  headers?: APIHeader[];
  examples?: any[];
}

export interface APIHeader {
  name: string;
  type: string;
  description: string;
  example?: string;
}

export interface APISchema {
  id: string;                    // Schema identifier
  title: string;                 // Schema title
  type: string;                  // JSON Schema type
  properties: Record<string, APISchemaProperty>;
  required?: string[];
  example?: any;
}

export interface APISchemaProperty {
  type: string;
  description: string;
  format?: string;
  example?: any;
  items?: APISchemaProperty;     // For arrays
  properties?: Record<string, APISchemaProperty>; // For objects
}

export interface APIExample {
  id: string;                    // Example identifier
  title: string;                 // Example title
  description: string;           // What the example demonstrates
  request?: APIExampleRequest;
  response?: APIExampleResponse;
  codeExamples: CodeExample[];
}

export interface APIExampleRequest {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: any;
}

export interface APIExampleResponse {
  statusCode: number;
  headers?: Record<string, string>;
  body?: any;
}

export interface APIAuth {
  type: 'none' | 'apikey' | 'bearer' | 'basic' | 'oauth2';
  description: string;
  location?: 'header' | 'query' | 'cookie'; // For API key auth
  name?: string;                 // Parameter name for API key
}

export interface APIChangeLogEntry {
  version: string;
  date: Date;
  changes: string[];
  breaking: boolean;
}

export interface APIDeprecation {
  item: string;                  // What is deprecated
  since: string;                 // Version when deprecated
  removeIn?: string;             // Version when will be removed
  replacement?: string;          // Recommended replacement
  reason: string;                // Why it's deprecated
}

export interface CodeExample {
  id: string;                    // Example identifier
  title: string;                 // Example title
  description: string;           // What the example demonstrates
  language: string;              // Programming language
  code: string;                  // Code content

  // Context
  category: string;              // Example category
  tags: string[];                // Searchable tags
  difficulty: 'basic' | 'intermediate' | 'advanced';

  // Assets
  files?: CodeExampleFile[];     // Additional files
  dependencies?: string[];       // Required dependencies

  // Execution
  runnable: boolean;             // Whether example can be executed
  output?: string;               // Expected output

  // Related content
  relatedPages: string[];        // Related documentation page IDs
  relatedExamples: string[];     // Related code example IDs
}

export interface CodeExampleFile {
  path: string;                  // File path
  content: string;               // File content
  language: string;              // Programming language
  description?: string;          // File description
}

export interface GuideValidation {
  isValid: boolean;
  completeness: number;          // Percentage complete (0-100)
  errors: GuideValidationError[];
  warnings: GuideValidationWarning[];
  suggestions: GuideValidationSuggestion[];
}

export interface GuideValidationError {
  type: 'missing-page' | 'broken-workflow' | 'invalid-api-ref' | 'missing-example';
  message: string;
  pageId?: string;
  workflowId?: string;
  stepId?: string;
}

export interface GuideValidationWarning {
  type: 'outdated-screenshot' | 'missing-prerequisite' | 'low-completeness';
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export interface GuideValidationSuggestion {
  type: 'add-workflow' | 'improve-example' | 'update-screenshot';
  message: string;
  priority: 'low' | 'medium' | 'high';
}