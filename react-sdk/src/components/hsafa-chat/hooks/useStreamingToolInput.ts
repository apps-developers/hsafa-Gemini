import { useEffect, useRef } from 'react';

export function useStreamingToolInput(
  chatMessages: any[],
  allTools: Record<string, any>,
  renderOrUpdateUserForm: (input: any, toolCallId: string) => void
) {
  const lastProcessedInputRef = useRef<Map<string, string>>(new Map());
  const toolCallCounterRef = useRef<Map<string, number>>(new Map());
  const allToolsRef = useRef(allTools);
  const renderOrUpdateUserFormRef = useRef(renderOrUpdateUserForm);

  // Update refs without triggering re-render
  allToolsRef.current = allTools;
  renderOrUpdateUserFormRef.current = renderOrUpdateUserForm;

  useEffect(() => {
  

    chatMessages.forEach((message: any) => {
      if (message.role !== 'assistant') return;
      message.parts?.forEach((part: any) => {
        if (!part.toolCallId) return;
        
        let toolName = part.toolName;
        if (!toolName && part.type?.startsWith('tool-')) toolName = part.type.replace(/^tool-/, '');
        if (!toolName) return;

        // Increment tool call number for each valid tool call

        const toolConfig = allToolsRef.current[toolName];
        if (toolConfig && typeof toolConfig === 'object' && toolConfig.executeEachToken && toolConfig.tool) {
          const toolInput = part.input || part.args || {};
          const currentInput = JSON.stringify(toolInput);
          const lastInput = lastProcessedInputRef.current.get(part.toolCallId);
          if (currentInput !== lastInput && currentInput !== '{}') {
            lastProcessedInputRef.current.set(part.toolCallId, currentInput);
            try {
              if (toolName === 'requestInput') {
                renderOrUpdateUserFormRef.current(toolInput, part.toolCallId);
              } else {
                // Increment tool call number for this specific toolCallId
                const currentCount = toolCallCounterRef.current.get(part.toolCallId) || 0;
                const newCount = currentCount + 1;
               toolCallCounterRef.current.set(part.toolCallId, newCount);
                if(newCount > 1){
                  toolConfig.tool({...toolInput, toolCallNumber: newCount - 1});
                }
              }
            } catch {}
          }
        }
      });
    });
  }, [chatMessages]);
}
