// ============================================================
// HASSIBA SUITE ERP - Workflow Execution Engine
// Server-side execution logic for automated workflows
// ============================================================

import { 
  Workflow, 
  WorkflowStep, 
  WorkflowTrigger, 
  StepConfig,
  ExecutionRecord, 
  StepExecutionResult,
  ExecutionError,
  ConditionGroup,
  ComparisonOperator,
  RetryConfig
} from '@/lib/types/workflow';
import { v4 as uuidv4 } from 'uuid';

// ============================================================
// Engine Configuration
// ============================================================

export interface EngineConfig {
  maxExecutionTimeMs: number;
  maxStepsPerExecution: number;
  defaultTimeoutMs: number;
  enableLogging: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  maxExecutionTimeMs: 300000, // 5 minutes
  maxStepsPerExecution: 1000,
  defaultTimeoutMs: 30000, // 30 seconds per step
  enableLogging: true,
  logLevel: 'info'
};

// ============================================================
// Execution Context
// ============================================================

export interface ExecutionContext {
  executionId: string;
  workflowId: string;
  workflowVersion: number;
  variables: Record<string, any>;
  triggerData?: Record<string, any>;
  startedAt: Date;
  config: EngineConfig;
  logs: ExecutionLogEntry[];
  currentStepIndex: number;
  status: 'running' | 'waiting' | 'completed' | 'failed' | 'cancelled' | 'timed_out';
}

export interface ExecutionLogEntry {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  stepId?: string;
  message: string;
  data?: Record<string, any>;
}

// ============================================================
// Main Engine Class
// ============================================================

export class WorkflowEngine {
  private config: EngineConfig;
  
  constructor(config: Partial<EngineConfig> = {}) {
    this.config = { ...DEFAULT_ENGINE_CONFIG, ...config };
  }

  // ============================================================
  // Public API
  // ============================================================

  /**
   * Execute a workflow with given input data
   */
  async execute(
    workflow: Workflow,
    triggerData?: Record<string, any>,
    inputVariables?: Record<string, any>
  ): Promise<ExecutionRecord> {
    const executionId = uuidv4();
    const startTime = new Date();
    
    // Initialize execution context
    const context: ExecutionContext = {
      executionId,
      workflowId: workflow.id,
      workflowVersion: workflow.version,
      variables: this.initializeVariables(workflow.variables, inputVariables),
      triggerData,
      startedAt: startTime,
      config: this.config,
      logs: [],
      currentStepIndex: 0,
      status: 'running'
    };

    this.log(context, 'info', `Starting workflow execution: ${workflow.name}`);

    try {
      // Check timeout
      const timeoutCheck = setTimeout(() => {
        if (context.status === 'running') {
          context.status = 'timed_out';
          this.log(context, 'error', `Workflow execution timed out after ${this.config.maxExecutionTimeMs}ms`);
        }
      }, this.config.maxExecutionTimeMs);

      // Find and execute starting step (first step or trigger-connected step)
      const steps = this.buildStepMap(workflow.steps);
      const startStep = this.findStartStep(workflow.steps);
      
      if (!startStep) {
        throw new Error('No starting step found in workflow');
      }

      // Execute steps sequentially
      const stepResults: StepExecutionResult[] = [];
      let currentStep: WorkflowStep | null = startStep;
      let stepCount = 0;

      while (currentStep && stepCount < this.config.maxStepsPerExecution) {
        if (context.status !== 'running') break;

        stepCount++;
        context.currentStepIndex = stepCount;

        const result = await this.executeStep(currentStep, context, steps);
        stepResults.push(result);

        // Determine next step based on result
        currentStep = this.determineNextStep(currentStep, result, steps, context);
      }

      clearTimeout(timeoutCheck);

      // Build final execution record
      const endTime = new Date();
      const durationMs = endTime.getTime() - startTime.getTime();

      context.status = context.status === 'running' ? 'completed' : context.status;

      const executionRecord: ExecutionRecord = {
        id: executionId,
        workflowId: workflow.id,
        workflowVersion: workflow.version,
        status: context.status as ExecutionRecord['status'],
        triggerData,
        inputVariables: inputVariables || {},
        outputVariables: this.extractOutputVariables(workflow.variables, context.variables),
        steps: stepResults,
        startedAt: startTime,
        completedAt: endTime,
        durationMs,
        metadata: {
          totalStepsExecuted: stepCount,
          engineVersion: '1.0.0'
        }
      };

      this.log(context, 'info', `Workflow execution ${context.status}: ${durationms}ms, ${stepCount} steps`);

      return executionRecord;

    } catch (error) {
      const endTime = new Date();
      const durationMs = endTime.getTime() - startTime.getTime();

      this.log(context, 'error', `Workflow execution failed: ${(error as Error).message}`);

      return {
        id: executionId,
        workflowId: workflow.id,
        workflowVersion: workflow.version,
        status: 'failed',
        triggerData,
        inputVariables: inputVariables || {},
        steps: [],
        startedAt: startTime,
        completedAt: endTime,
        durationMs,
        error: {
          code: 'EXECUTION_ERROR',
          message: (error as Error).message,
          stackTrace: (error as Error).stack,
          recoverable: false
        },
        logs: context.logs.map(l => ({
          timestamp: l.timestamp,
          level: l.level,
          message: l.message,
          data: l.data
        }))
      };
    }
  }

  /**
   * Validate a workflow definition before saving/activating
   */
  validateWorkflow(workflow: Workflow): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check basic structure
    if (!workflow.name || workflow.name.trim().length === 0) {
      errors.push({ field: 'name', message: 'Le nom du workflow est requis' });
    }

    if (!workflow.trigger) {
      errors.push({ field: 'trigger', message: 'Un déclencheur est requis' });
    } else {
      // Validate trigger configuration
      this.validateTrigger(workflow.trigger, errors, warnings);
    }

    if (!workflow.steps || workflow.steps.length === 0) {
      warnings.push({ field: 'steps', message: 'Aucune étape définie' });
    } else {
      // Validate each step
      workflow.steps.forEach((step, index) => {
        this.validateStep(step, index, workflow.steps, errors, warnings);
      });

      // Check for disconnected nodes
      const connectedSteps = new Set<string>();
      connectedSteps.add(workflow.steps[0]?.id); // Start step is always "connected"
      
      workflow.steps.forEach(step => {
        if (step.nextStepId) connectedSteps.add(step.nextStepId);
        if (step.trueStepId) connectedSteps.add(step.trueStepId);
        if (step.falseStepId) connectedSteps.add(step.falseStepId);
      });

      workflow.steps.forEach(step => {
        if (!connectedSteps.has(step.id)) {
          warnings.push({ 
            field: `steps[${step.id}]`, 
            message: `L'étape "${step.name}" n'est pas connectée au flux principal` 
          });
        }
      });

      // Check for cycles
      if (this.hasCycle(workflow.steps)) {
        errors.push({ field: 'steps', message: 'Cycle détecté dans le flux de travail' });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Evaluate a condition group against variables
   */
  evaluateCondition(
    condition: ConditionGroup,
    variables: Record<string, any>
  ): boolean {
    const results = condition.conditions.map(c => 
      this.evaluateSingleCondition(c, variables)
    );

    if (condition.logic === 'AND') {
      return results.every(r => r === true);
    } else {
      return results.some(r => r === true);
    }
  }

  // ============================================================
  // Private Methods - Step Execution
  // ============================================================

  private async executeStep(
    step: WorkflowStep,
    context: ExecutionContext,
    stepMap: Map<string, WorkflowStep>
  ): Promise<StepExecutionResult> {
    const startTime = new Date();
    
    this.log(context, 'info', `Executing step: ${step.name}`, { stepId: step.id });

    // Check if step is enabled
    if (!step.enabled) {
      return this.createSkippedResult(step, startTime, 'Step disabled');
    }

    // Set up timeout
    const timeoutMs = step.timeoutMs || this.config.defaultTimeoutMs;
    
    let result: StepExecutionResult;
    
    try {
      // Execute based on step type with timeout
      result = await Promise.race([
        this.executeStepByType(step, context),
        new Promise<StepExecutionResult>((_, reject) =>
          setTimeout(() => reject(new Error(`Step timeout after ${timeoutMs}ms`)), timeoutMs)
        )
      ]);
    } catch (error) {
      // Handle error with retry logic
      if (step.retryConfig && this.shouldRetry(error as Error, step.retryConfig)) {
        return await this.executeWithRetry(step, context, stepMap, error as Error, startTime);
      }
      
      result = this.createFailedResult(step, startTime, error as Error);
    }

    // Update context variables from step output
    if (result.output) {
      Object.assign(context.variables, result.output);
    }

    return result;
  }

  private async executeStepByType(
    step: WorkflowStep,
    context: ExecutionContext
  ): Promise<StepExecutionResult> {
    const startTime = new Date();
    const config = step.config;

    switch (step.type) {
      case 'action':
        return await this.executeAction(config, step, context, startTime);
      
      case 'condition':
        return this.evaluateConditionStep(config, step, context, startTime);
      
      case 'delay':
        return await this.executeDelay(config, step, context, startTime);
      
      case 'loop':
        return await this.executeLoop(config, step, context, startTime);
      
      case 'approval':
        return this.createWaitingResult(step, startTime, 'Waiting for approval');
      
      case 'parallel':
        return await this.executeParallel(config, step, context, startTime);
      
      case 'switch':
        return this.evaluateSwitchCase(config, step, context, startTime);
      
      case 'transform':
        return this.executeTransform(config, step, context, startTime);
      
      case 'http_request':
        return await this.executeHttpRequest(config, step, context, startTime);
      
      case 'sub_workflow':
        return await this.executeSubWorkflow(config, step, context, startTime);
      
      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }

  private async executeAction(
    config: StepConfig,
    step: WorkflowStep,
    context: ExecutionContext,
    startTime: Date
  ): Promise<StepExecutionResult> {
    const actionType = config.actionType;
    
    this.log(context, 'debug', `Executing action: ${actionType}`, { stepId: step.id });

    // Simulate different actions (in production, these would call actual services)
    let output: Record<string, any> = {};

    switch (actionType) {
      case 'send_email':
        output = await this.mockSendEmail(config.actionParams, context.variables);
        break;
      
      case 'send_sms':
        output = await this.mockSendSms(config.actionParams, context.variables);
        break;
      
      case 'send_notification':
        output = await this.mockSendNotification(config.actionParams, context.variables);
        break;
      
      case 'create_record':
        output = await this.mockCreateRecord(config.actionParams, context.variables);
        break;
      
      case 'update_record':
        output = await this.mockUpdateRecord(config.actionParams, context.variables);
        break;
      
      case 'find_record':
        output = await this.mockFindRecord(config.actionParams, context.variables);
        break;
      
      case 'call_api':
        output = await this.mockCallApi(config.actionParams, context.variables);
        break;
      
      case 'set_variable':
        output = this.setVariables(config.actionParams, context.variables);
        break;
      
      case 'generate_pdf':
        output = await this.mockGeneratePdf(config.actionParams, context.variables);
        break;
      
      case 'generate_excel':
        output = await this.mockGenerateExcel(config.actionParams, context.variables);
        break;
      
      case 'log_message':
        this.log(context, config.actionParams?.level || 'info', config.actionParams?.message || '');
        output = { logged: true };
        break;
      
      case 'webhook_call':
        output = await this.mockWebhookCall(config.actionParams, context.variables);
        break;
      
      default:
        throw new Error(`Unknown action type: ${actionType}`);
    }

    return this.createCompletedResult(step, startTime, {}, output);
  }

  private evaluateConditionStep(
    config: StepConfig,
    step: WorkflowStep,
    context: ExecutionContext,
    startTime: Date
  ): StepExecutionResult {
    let conditionResult: boolean;

    if (config.conditionType === 'expression' && config.expression) {
      // Simple expression evaluation (in production, use a safe eval library)
      conditionResult = this.evaluateExpression(config.expression, context.variables);
    } else if (config.conditions && config.conditions.length > 0) {
      conditionResult = this.evaluateCondition(config.conditions[0], context.variables);
    } else {
      throw new Error('No condition defined');
    }

    this.log(context, 'info', `Condition "${step.name}" evaluated to: ${conditionResult}`, { stepId: step.id });

    return this.createCompletedResult(step, startTime, {}, { 
      result: conditionResult,
      branch: conditionResult ? 'true' : 'false'
    });
  }

  private async executeDelay(
    config: StepConfig,
    step: WorkflowStep,
    context: ExecutionContext,
    startTime: Date
  ): Promise<StepExecutionResult> {
    let delayMs: number;

    switch (config.delayType) {
      case 'fixed':
        delayMs = this.calculateDelayMs(config.duration || 0, config.delayUnit || 'seconds');
        break;
      
      case 'until_date':
        if (config.untilDate) {
          const targetDate = new Date(config.untilDate);
          delayMs = Math.max(0, targetDate.getTime() - Date.now());
        } else {
          delayMs = 0;
        }
        break;
      
      case 'business_hours':
        // Simplified business hours calculation
        delayMs = this.calculateBusinessHoursDelay(config.duration || 0, config.delayUnit || 'hours');
        break;
      
      default:
        delayMs = 0;
    }

    this.log(context, 'info', `Delaying for ${delayMs}ms`, { stepId: step.id });

    if (delayMs > 0) {
      await this.sleep(delayMs);
    }

    return this.createCompletedResult(step, startTime, {}, { delayedFor: delayMs });
  }

  private async executeLoop(
    config: StepConfig,
    step: WorkflowStep,
    context: ExecutionContext,
    startTime: Date
  ): Promise<StepExecutionResult> {
    const items = this.resolveVariablePath(config.iterateOver || '', context.variables);
    
    if (!Array.isArray(items)) {
      throw new Error(`Cannot iterate over non-array: ${config.iterateOver}`);
    }

    this.log(context, 'info', `Looping over ${items.length} items`, { stepId: step.id });

    const results: any[] = [];
    
    for (let i = 0; i < items.length; i++) {
      // Set loop variable
      if (config.loopVariable) {
        context.variables[config.loopVariable] = items[i];
        context.variables[`${config.loopVariable}_index`] = i;
      }

      // In a real implementation, we would execute sub-steps here
      results.push(items[i]);
    }

    return this.createCompletedResult(step, startTime, {}, { 
      iterations: items.length,
      results 
    });
  }

  private async executeParallel(
    config: StepConfig,
    step: WorkflowStep,
    context: ExecutionContext,
    startTime: Date
  ): Promise<StepExecutionResult> {
    this.log(context, 'info', `Executing ${config.branches?.length || 0} branches in parallel`, { stepId: step.id });

    // In a real implementation, execute all branches concurrently
    const branchResults: Record<string, any> = {};

    if (config.branches) {
      const promises = config.branches.map(async (branch) => {
        // Simulate branch execution
        branchResults[branch.id] = { status: 'completed', branch: branch.name };
      });

      if (config.waitAll) {
        await Promise.all(promises);
      } else {
        await Promise.race(promises);
      }
    }

    return this.createCompletedResult(step, startTime, {}, branchResults);
  }

  private evaluateSwitchCase(
    config: StepConfig,
    step: WorkflowStep,
    context: ExecutionContext,
    startTime: Date
  ): StepExecutionResult {
    // Get value to switch on
    const switchValue = context.variables._switchValue; // Would be set by previous step
    
    const matchedCase = config.cases?.find(c => c.value === switchValue);
    
    this.log(context, 'info', `Switch evaluated: ${switchValue} -> ${matchedCase?.value || 'default'}`, { stepId: step.id });

    return this.createCompletedResult(step, startTime, {}, {
      matchedValue: switchValue,
      matchedCaseId: matchedCase?.stepId,
      useDefault: !matchedCase
    });
  }

  private executeTransform(
    config: StepConfig,
    step: WorkflowStep,
    context: ExecutionContext,
    startTime: Date
  ): StepExecutionResult {
    let result: any;

    if (config.transformations) {
      for (const transform of config.transformations) {
        const sourceData = this.resolveVariablePath(transform.source, context.variables);
        
        switch (transform.type) {
          case 'map':
            result = sourceData?.map((item: any, idx: number) => 
              this.applyTransformation(item, transform.config, context.variables)
            );
            break;
          
          case 'filter':
            result = sourceData?.filter((item: any) => 
                this.evaluateFilterCondition(item, transform.config, context.variables)
              );
            break;
          
          case 'sort':
            result = [...(sourceData || [])].sort((a: any, b: any) =>
              this.compareValues(a, b, transform.config.field, transform.config.order)
            );
            break;
          
          case 'join':
            result = sourceData?.join(transform.config.separator || ', ');
            break;
          
          case 'format':
            result = this.formatValue(sourceData, transform.config);
            break;
          
          case 'calculate':
            result = this.calculate(sourceData, transform.config.operation, transform.config.operand);
            break;
        }

        // Store result in target variable
        if (transform.target) {
          this.setNestedVariable(context.variables, transform.target, result);
        }
      }
    }

    return this.createCompletedResult(step, startTime, {}, { transformed: true, result });
  }

  private async executeHttpRequest(
    config: StepConfig,
    step: WorkflowStep,
    context: ExecutionContext,
    startTime: Date
  ): Promise<StepExecutionResult> {
    // Mock HTTP request (in production, use fetch/axios)
    this.log(context, 'info', `HTTP ${config.method} request to ${config.url}`, { stepId: step.id });

    const mockResponse = {
      status: 200,
      data: { success: true, message: 'Mock response' },
      headers: { 'content-type': 'application/json' }
    };

    return this.createCompletedResult(step, startTime, {}, mockResponse);
  }

  private async executeSubWorkflow(
    config: StepConfig,
    step: WorkflowStep,
    context: ExecutionContext,
    startTime: Date
  ): Promise<StepExecutionResult> {
    this.log(context, 'info', `Executing sub-workflow: ${config.workflowId}`, { stepId: step.id });

    // In production, load and execute the sub-workflow
    return this.createCompletedResult(step, startTime, {}, {
      subWorkflowId: config.workflowId,
      completed: true
    });
  }

  // ============================================================
  // Private Helpers - Flow Control
  // ============================================================

  private determineNextStep(
    currentStep: WorkflowStep,
    result: StepExecutionResult,
    stepMap: Map<string, WorkflowStep>,
    context: ExecutionContext
  ): WorkflowStep | null {
    // If step failed and has error handler
    if (result.status === 'failed' && currentStep.errorStepId) {
      return stepMap.get(currentStep.errorStepId) || null;
    }

    // If step is waiting (e.g., approval), stop execution
    if (result.status === 'waiting') {
      context.status = 'waiting';
      return null;
    }

    // Handle condition branching
    if (currentStep.type === 'condition' && result.output) {
      const branch = result.output.branch;
      if (branch === 'true' && currentStep.trueStepId) {
        return stepMap.get(currentStep.trueStepId) || null;
      }
      if (branch === 'false' && currentStep.falseStepId) {
        return stepMap.get(currentStep.falseStepId) || null;
      }
    }

    // Default: follow nextStepId
    if (currentStep.nextStepId) {
      return stepMap.get(currentStep.nextStepId) || null;
    }

    return null; // End of flow
  }

  private findStartStep(steps: WorkflowStep[]): WorkflowStep | null {
    if (steps.length === 0) return null;
    
    // First step that has no incoming connections (or just return first step)
    return steps[0];
  }

  private buildStepMap(steps: WorkflowStep[]): Map<string, WorkflowStep> {
    const map = new Map<string, WorkflowStep>();
    steps.forEach(step => map.set(step.id, step));
    return map;
  }

  private hasCycle(steps: WorkflowStep[]): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const visit = (stepId: string): boolean => {
      if (recursionStack.has(stepId)) return true; // Cycle detected
      if (visited.has(stepId)) return false;

      visited.add(stepId);
      recursionStack.add(stepId);

      const step = steps.find(s => s.id === stepId);
      if (step) {
        for (const nextId of [step.nextStepId, step.trueStepId, step.falseStepId]) {
          if (nextId && visit(nextId)) return true;
        }
      }

      recursionStack.delete(stepId);
      return false;
    };

    for (const step of steps) {
      if (!visited.has(step.id)) {
        if (visit(step.id)) return true;
      }
    }

    return false;
  }

  // ============================================================
  // Private Helpers - Result Creation
  // ============================================================

  private createCompletedResult(
    step: WorkflowStep,
    startTime: Date,
    input: Record<string, any>,
    output: Record<string, any>
  ): StepExecutionResult {
    const endTime = new Date();
    return {
      stepId: step.id,
      stepName: step.name,
      status: 'completed',
      startedAt: startTime,
      completedAt: endTime,
      durationMs: endTime.getTime() - startTime.getTime(),
      input,
      output
    };
  }

  private createFailedResult(
    step: WorkflowStep,
    startTime: Date,
    error: Error
  ): StepExecutionResult {
    const endTime = new Date();
    return {
      stepId: step.id,
      stepName: step.name,
      status: 'failed',
      startedAt: startTime,
      completedAt: endTime,
      durationMs: endTime.getTime() - startTime.getTime(),
      error: {
        code: 'STEP_ERROR',
        message: error.message,
        details: {},
        recoverable: false
      }
    };
  }

  private createSkippedResult(
    step: WorkflowStep,
    startTime: Date,
    reason: string
  ): StepExecutionResult {
    return {
      stepId: step.id,
      stepName: step.name,
      status: 'skipped',
      startedAt: startTime,
      completedAt: new Date()
    };
  }

  private createWaitingResult(
    step: WorkflowStep,
    startTime: Date,
    reason: string
  ): StepExecutionResult {
    return {
      stepId: step.id,
      stepName: step.name,
      status: 'waiting',
      startedAt: startTime
    };
  }

  // ============================================================
  // Private Helpers - Retry Logic
  // ============================================================

  private shouldRetry(error: Error, retryConfig: RetryConfig): boolean {
    return retryConfig.maxRetries > 0 && 
           (retryConfig.retryOn.length === 0 || retryConfig.retryOn.includes(error.message));
  }

  private async executeWithRetry(
    step: WorkflowStep,
    context: ExecutionContext,
    stepMap: Map<string, WorkflowStep>,
    initialError: Error,
    startTime: Date
  ): Promise<StepExecutionResult> {
    const retryConfig = step.retryConfig!;
    let lastError = initialError;
    let retryCount = 0;
    let delay = retryConfig.retryDelayMs;

    while (retryCount < retryConfig.maxRetries) {
      retryCount++;
      this.log(context, 'warn', `Retry ${retryCount}/${retryConfig.maxRetries} for step: ${step.name}`, { stepId: step.id });
      
      await this.sleep(delay);
      delay *= retryConfig.backoffMultiplier;

      try {
        return await this.executeStepByType(step, context);
      } catch (error) {
        lastError = error as Error;
      }
    }

    return this.createFailedResult(step, startTime, lastError);
  }

  // ============================================================
  // Private Helpers - Variable Resolution
  // ============================================================

  private initializeVariables(
    definitions: WorkflowVariable[],
    inputs?: Record<string, any>
  ): Record<string, any> {
    const vars: Record<string, any> = {};
    
    definitions.forEach(def => {
      if (inputs && def.key in inputs) {
        vars[def.key] = inputs[def.key];
      } else if (def.defaultValue !== undefined) {
        vars[def.key] = def.defaultValue;
      }
    });

    return vars;
  }

  private extractOutputVariables(
    definitions: WorkflowVariable[],
    currentVars: Record<string, any>
  ): Record<string, any> {
    const outputs: Record<string, any> = {};
    
    definitions.filter(d => d.isOutput).forEach(def => {
      if (currentVars[def.key] !== undefined) {
        outputs[def.key] = currentVars[def.key];
      }
    });

    return outputs;
  }

  private resolveVariablePath(path: string, variables: Record<string, any>): any {
    if (!path) return undefined;
    
    const parts = path.split('.');
    let current: any = variables;
    
    for (const part of parts) {
      if (current === undefined || current === null) return undefined;
      current = current[part];
    }
    
    return current;
  }

  private setNestedVariable(obj: Record<string, any>, path: string, value: any): void {
    const parts = path.split('.');
    let current: any = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in current)) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }
    
    current[parts[parts.length - 1]] = value;
  }

  // ============================================================
  // Private Helpers - Condition Evaluation
  // ============================================================

  private evaluateSingleCondition(condition: any, variables: Record<string, any>): boolean {
    const fieldValue = this.resolveVariablePath(condition.field, variables);
    const compareValue = condition.valueType === 'variable' 
      ? this.resolveVariablePath(String(condition.value), variables)
      : condition.value;

    return this.compare(fieldValue, condition.operator, compareValue);
  }

  private compare(left: any, operator: ComparisonOperator, right: any): boolean {
    switch (operator) {
      case 'eq': return left === right;
      case 'neq': return left !== right;
      case 'gt': return Number(left) > Number(right);
      case 'gte': return Number(left) >= Number(right);
      case 'lt': return Number(left) < Number(right);
      case 'lte': return Number(left) <= Number(right);
      case 'contains': return String(left).includes(String(right));
      case 'not_contains': return !String(left).includes(String(right));
      case 'starts_with': return String(left).startsWith(String(right));
      case 'ends_with': return String(left).endsWith(String(right));
      case 'is_empty': return left === undefined || left === null || left === '' || (Array.isArray(left) && left.length === 0);
      case 'is_not_empty': return !(left === undefined || left === null || left === '' || (Array.isArray(left) && left.length === 0));
      case 'in': return Array.isArray(right) && right.includes(left);
      case 'not_in': return !Array.isArray(right) || !right.includes(left);
      case 'is_true': return left === true;
      case 'is_false': return left === false;
      case 'is_null': return left === null || left === undefined;
      case 'is_not_null': return !(left === null || left === undefined);
      default: return false;
    }
  }

  private evaluateExpression(expression: string, variables: Record<string, any>): boolean {
    // Simple expression evaluation - replace variables and evaluate
    // WARNING: In production, use a safe expression evaluator!
    try {
      let evalExpr = expression;
      
      // Replace {{variable}} patterns
      const varPattern = /\{\{([^}]+)\}\}/g;
      evalExpr = evalExpr.replace(varPattern, (_, path) => {
        const value = this.resolveVariablePath(path.trim(), variables);
        return JSON.stringify(value);
      });

      // Safe-ish evaluation for simple comparisons
      return Function('"use strict"; return (' + evalExpr + ')')();
    } catch {
      return false;
    }
  }

  // ============================================================
  // Private Helpers - Mock Actions (Replace with real implementations)
  // ============================================================

  private async mockSendEmail(params: any, variables: Record<string, any>): Promise<any> {
    this.logDebug('mock', `Sending email to: ${this.resolveTemplate(params.to, variables)}`);
    return { emailId: uuidv4(), status: 'sent', to: this.resolveTemplate(params.to, variables) };
  }

  private async mockSendSms(params: any, variables: Record<string, any>): Promise<any> {
    return { smsId: uuidv4(), status: 'sent', to: params.to };
  }

  private async mockSendNotification(params: any, variables: Record<string, any>): Promise<any> {
    return { notificationId: uuidv4(), status: 'delivered' };
  }

  private async mockCreateRecord(params: any, variables: Record<string, any>): Promise<any> {
    return { recordId: uuidv4(), entity: params.entity, created: true };
  }

  private async mockUpdateRecord(params: any, variables: Record<string, any>): Promise<any> {
    return { updated: true, entity: params.entity, id: params.id };
  }

  private async mockFindRecord(params: any, variables: Record<string, any>): Promise<any> {
    return { records: [], count: 0 };
  }

  private async mockCallApi(params: any, variables: Record<string, any>): Promise<any> {
    return { response: {}, statusCode: 200 };
  }

  private setVariables(params: any, variables: Record<string, any>): any {
    if (params.variables) {
      params.variables.forEach((v: any) => {
        variables[v.key] = this.resolveTemplate(String(v.value), variables);
      });
    }
    return { variablesSet: true };
  }

  private async mockGeneratePdf(params: any, variables: Record<string, any>): Promise<any> {
    return { fileUrl: `/files/${uuidv4()}.pdf`, filename: params.filename || 'document.pdf' };
  }

  private async mockGenerateExcel(params: any, variables: Record<string, any>): Promise<any> {
    return { fileUrl: `/files/${uuidv4()}.xlsx`, filename: params.filename || 'data.xlsx' };
  }

  private async mockWebhookCall(params: any, variables: Record<string, any>): Promise<any> {
    return { sent: true, url: params.url, statusCode: 200 };
  }

  // ============================================================
  // Private Utilities
  // ============================================================

  private resolveTemplate(template: string, variables: Record<string, any>): string {
    if (!template) return template;
    
    return template.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
      const value = this.resolveVariablePath(path.trim(), variables);
      return value !== undefined ? String(value) : '';
    });
  }

  private calculateDelayMs(duration: number, unit: string): number {
    const multipliers: Record<string, number> = {
      seconds: 1000,
      minutes: 60000,
      hours: 3600000,
      days: 86400000,
      weeks: 604800000
    };
    return duration * (multipliers[unit] || 1000);
  }

  private calculateBusinessHoursDelay(duration: number, unit: string): number {
    // Simplified: assume 8 business hours per day
    const baseDelay = this.calculateDelayMs(duration, unit);
    // Roughly multiply by 3 to account for non-working hours
    return baseDelay * 3;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private log(context: ExecutionContext, level: ExecutionLogEntry['level'], message: string, data?: Record<string, any>) {
    if (!this.config.enableLogging) return;
    
    const levels = ['debug', 'info', 'warn', 'error'];
    const configLevelIndex = levels.indexOf(this.config.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    
    if (messageLevelIndex < configLevelIndex) return;

    context.logs.push({
      timestamp: new Date(),
      level,
      message,
      data
    });
  }

  private logDebug(action: string, message: string) {
    if (this.config.enableLogging && this.config.logLevel === 'debug') {
      console.log(`[WorkflowEngine:${action}] ${message}`);
    }
  }

  // ============================================================
  // Validation Methods
  // ============================================================

  private validateTrigger(trigger: WorkflowTrigger, errors: ValidationError[], warnings: ValidationWarning[]) {
    const validTypes = ['manual', 'schedule', 'event', 'webhook', 'form_submit'];
    
    if (!validTypes.includes(trigger.type)) {
      errors.push({ field: 'trigger.type', message: `Type de déclencheur invalide: ${trigger.type}` });
    }

    if (trigger.type === 'schedule' && !trigger.config.cron) {
      errors.push({ field: 'trigger.config.cron', message: 'Expression cron requise pour le déclencheur planifié' });
    }

    if (trigger.type === 'event' && !trigger.config.event) {
      errors.push({ field: 'trigger.config.event', message: 'Événement requis pour le déclencheur événementiel' });
    }

    if (trigger.type === 'webhook' && !trigger.config.secret) {
      warnings.push({ field: 'trigger.config.secret', message: 'Clé secrète recommandée pour la sécurité webhook' });
    }
  }

  private validateStep(
    step: WorkflowStep,
    index: number,
    allSteps: WorkflowStep[],
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ) {
    if (!step.name || step.name.trim().length === 0) {
      errors.push({ field: `steps[${index}].name`, message: 'Nom d\'étape requis' });
    }

    if (!step.type) {
      errors.push({ field: `steps[${index}].type`, message: 'Type d\'étape requis' });
    }

    // Validate step-specific configurations
    switch (step.type) {
      case 'condition':
        if (!step.trueStepId && !step.falseStepId) {
          warnings.push({ field: `steps[${index}]`, message: 'La condition n\'a pas de branches définies' });
        }
        break;
      
      case 'approval':
        if (!step.config.approvers || step.config.approvers.length === 0) {
          errors.push({ field: `steps[${index}].config.approvers`, message: 'Au moins un approbateur requis' });
        }
        break;
      
      case 'delay':
        if (step.config.delayType === 'fixed' && !step.config.duration) {
          errors.push({ field: `steps[${index}].config.duration`, message: 'Durée requise pour le délai fixe' });
        }
        break;
    }

    // Validate referenced steps exist
    [step.nextStepId, step.trueStepId, step.falseStepId, step.errorStepId].forEach(ref => {
      if (ref && !allSteps.find(s => s.id === ref)) {
        errors.push({ field: `steps[${index}]`, message: `Référence à une étape inexistante: ${ref}` });
      }
    });
  }

  // Additional helper methods for transform operations
  private applyTransformation(item: any, config: any, variables: Record<string, any>): any {
    // Apply transformation to single item
    if (config.mapping) {
      const result: any = {};
      for (const [target, source] of Object.entries(config.mapping)) {
        result[target as string] = item[source as string];
      }
      return result;
    }
    return item;
  }

  private evaluateFilterCondition(item: any, config: any, variables: Record<string, any>): boolean {
    if (config.field && config.operator) {
      return this.compare(item[config.field], config.operator, config.value);
    }
    return true;
  }

  private compareValues(a: any, b: any, field?: string, order?: string): number {
    const valA = field ? a[field] : a;
    const valB = field ? b[field] : b;
    
    if (valA < valB) return order === 'desc' ? 1 : -1;
    if (valA > valB) return order === 'desc' ? -1 : 1;
    return 0;
  }

  private formatValue(value: any, config: any): any {
    if (config.format === 'date' && value) {
      return new Date(value).toLocaleDateString('fr-FR', config.options);
    }
    if (config.format === 'number' && typeof value === 'number') {
      return value.toLocaleString('fr-FR', { decimals: config.decimals || 0 });
    }
    if (config.format === 'currency' && typeof value === 'number') {
      return value.toLocaleString('fr-FR', { style: 'currency', currency: config.currency || 'DZD' });
    }
    return value;
  }

  private calculate(value: any, operation: string, operand: any): any {
    const numVal = Number(value);
    const numOperand = Number(operand);
    
    switch (operation) {
      case 'add': return numVal + numOperand;
      case 'subtract': return numVal - numOperand;
      case 'multiply': return numVal * numOperand;
      case 'divide': return numOperand !== 0 ? numVal / numOperand : 0;
      case 'modulo': return numVal % numOperand;
      default: return value;
    }
  }
}

// ============================================================
// Types for Validation
// ============================================================

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
}

// ============================================================
// Singleton Export
// ============================================================

export const workflowEngine = new WorkflowEngine();

// Export utility functions
export function createEngine(config?: Partial<EngineConfig>): WorkflowEngine {
  return new WorkflowEngine(config);
}
