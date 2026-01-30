export interface ActionContext {
  name: string;
  trigger: 'partial' | 'final' | 'params_complete';
  index: number;
  assistantMessageId?: string;
  chatId?: string;
}

export type ActionHandler = (params: any, context: ActionContext) => void | Promise<void>;

export function hasActionParamsStabilized(
  actionParamsHistory: Map<string, any[]>,
  actionKey: string, 
  currentParams: any
): boolean {
  const history = actionParamsHistory.get(actionKey) || [];
  const stringifiedParams = JSON.stringify(currentParams);
  
  // Add current params to history
  history.push(stringifiedParams);
  
  // Keep only last 5 entries to detect stabilization with better accuracy
  if (history.length > 5) {
    history.shift();
  }
  
  actionParamsHistory.set(actionKey, history);
  
  // Consider stabilized if params haven't changed in last 3 updates (more robust)
  if (history.length >= 3) {
    const lastThree = history.slice(-3);
    return lastThree.every(params => params === lastThree[0]);
  }
  
  return false;
}

export function processActions(
  items: any[] | undefined,
  trigger: 'partial' | 'final',
  options: {
    actions: Map<string, ActionHandler>;
    currentChatId?: string | null;
    actionExecMap: Record<string, boolean>;
    assistantMsgId?: string;
    calledFinalActions: Set<string>;
    actionParamsHistory: Map<string, any[]>;
    actionExecutionStatus: Map<string, 'executing' | 'executed' | any>;
    setActionStatuses: (updater: (prev: Map<string, 'executing' | 'executed'>) => Map<string, 'executing' | 'executed'>) => void;
    hasActionParamsStabilized: (actionKey: string, currentParams: any) => boolean;
  }
) {
  const {
    actions,
    currentChatId,
    actionExecMap,
    assistantMsgId,
    calledFinalActions,
    actionParamsHistory,
    actionExecutionStatus,
    setActionStatuses,
    hasActionParamsStabilized
  } = options;

  if (!Array.isArray(items) || items.length === 0) return;
  
  items.forEach((it, idx) => {
    if (!it || typeof it !== 'object') return;
    if (it.type === 'action') {
      const name = String(it.name ?? '').trim();
      if (!name) return;
      const handler = actions.get(name);
      if (!handler) {
        console.warn(`Action handler not found for: ${name}`);
        return;
      }
      
      const executeOnStream = !!actionExecMap[name];
      const key = `${assistantMsgId || 'assist'}:${name}:${idx}`;
      const actionKey = `${name}:${idx}`;
      
      try {
        if (trigger === 'partial' && executeOnStream) {
          // Execute on each partial update (streaming mode)
          setActionStatuses(prev => new Map(prev).set(actionKey, 'executing'));
          
          // Add debouncing for rapid fire actions
          const timeoutId = setTimeout(() => {
            Promise.resolve(handler(it.params, { 
              name, 
              trigger, 
              index: idx, 
              assistantMessageId: assistantMsgId, 
              chatId: currentChatId || undefined 
            })).catch(error => {
              console.error(`Error executing streaming action ${name}:`, error);
              setActionStatuses(prev => new Map(prev).set(actionKey, 'executed'));
            });
          }, 50); // 50ms debounce
          
          // Store timeout for cleanup if needed
          actionExecutionStatus.set(`${actionKey}_timeout`, timeoutId as any);
          
        } else if (trigger === 'partial' && !executeOnStream) {
          // Check if action parameters have stabilized (finished streaming)
          const isStabilized = hasActionParamsStabilized(actionKey, it.params);
          const currentStatus = actionExecutionStatus.get(actionKey);
          
          if (isStabilized && currentStatus !== 'executed') {
            // Parameters have stabilized, execute the action
            actionExecutionStatus.set(actionKey, 'executed');
            setActionStatuses(prev => new Map(prev).set(actionKey, 'executed'));
            
            Promise.resolve(handler(it.params, { 
              name, 
              trigger: 'params_complete', 
              index: idx, 
              assistantMessageId: assistantMsgId, 
              chatId: currentChatId || undefined 
            })).catch(error => {
              console.error(`Error executing stabilized action ${name}:`, error);
            });
          } else if (!currentStatus) {
            // First time seeing this action, mark as executing
            actionExecutionStatus.set(actionKey, 'executing');
            setActionStatuses(prev => new Map(prev).set(actionKey, 'executing'));
          }
        } else if (trigger === 'final') {
          // Final trigger - ensure action is executed if not already
          const currentStatus = actionExecutionStatus.get(actionKey);
          if (currentStatus !== 'executed' && !calledFinalActions.has(key)) {
            calledFinalActions.add(key);
            
            // Clear any pending timeouts
            const timeoutId = actionExecutionStatus.get(`${actionKey}_timeout`);
            if (timeoutId) {
              clearTimeout(timeoutId as any);
              actionExecutionStatus.delete(`${actionKey}_timeout`);
            }
            
            actionExecutionStatus.set(actionKey, 'executed');
            setActionStatuses(prev => new Map(prev).set(actionKey, 'executed'));
            
            Promise.resolve(handler(it.params, { 
              name, 
              trigger: executeOnStream ? 'final' : 'params_complete', 
              index: idx, 
              assistantMessageId: assistantMsgId, 
              chatId: currentChatId || undefined 
            })).catch(error => {
              console.error(`Error executing final action ${name}:`, error);
            });
          }
        }
      } catch (error) {
        console.error(`Error processing action ${name}:`, error);
      }
    }
  });
}
