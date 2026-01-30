import { HsafaChat } from '@hsafa/react-sdk';
import agentConfig from './simple-agent';

function ApprovalUI({ toolName, toolCallId, input, output, status, addToolResult, theme }: any) {
  const { action, details, severity = 'medium' } = input || {};
  
  const getSeverityColor = () => {
    switch (severity) {
      case 'high': return { bg: '#dc2626', border: '#dc2626' };
      case 'medium': return { bg: '#f59e0b', border: '#f59e0b' };
      default: return { bg: '#3b82f6', border: '#3b82f6' };
    }
  };
  
  const colors = getSeverityColor();
  
  const handleApprove = () => {
    addToolResult({
      toolName,
      toolCallId,
      output: {
        approved: true,
        action,
        timestamp: new Date().toISOString()
      }
    });
  };
  
  const handleReject = () => {
    addToolResult({
      toolName,
      toolCallId,
      output: {
        approved: false,
        action,
        timestamp: new Date().toISOString()
      }
    });
  };
  
  return (
    <div style={{
      padding: '16px',
      borderRadius: '8px',
      background: `${colors.bg}20`,
      border: `1px solid ${colors.border}50`,
      margin: '8px 0'
    }}>
      <div style={{ marginBottom: '12px' }}>
        <div style={{
          fontWeight: 600,
          fontSize: '14px',
          marginBottom: '8px',
          color: colors.bg
        }}>
          {severity === 'high' ? '⚠️ High Priority' : severity === 'medium' ? '⚡ Medium Priority' : 'ℹ️ Low Priority'}
        </div>
        <div style={{ fontSize: '14px', marginBottom: '4px' }}>
          <strong>Action:</strong> {action}
        </div>
        {details && (
          <div style={{ fontSize: '13px', color: '#6b7280' }}>
            {details}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={handleApprove}
          style={{
            flex: 1,
            padding: '8px 16px',
            background: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 500
          }}
        >
          ✓ Approve
        </button>
        <button
          onClick={handleReject}
          style={{
            flex: 1,
            padding: '8px 16px',
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 500
          }}
        >
          ✗ Reject
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const hsafaUI = {
    getUserApproval: ApprovalUI
  };

  return (
    <HsafaChat
      agentName="basic-chat"
      agentConfig={JSON.stringify(agentConfig)}
      HsafaUI={hsafaUI}
      fullPageChat={true}
      theme="dark"
      title="HSAFA Agent"
      placeholder="Ask me anything..."
      emptyStateMessage="Hi! I'm your AI assistant. How can I help you today?"
    />
  );
}
