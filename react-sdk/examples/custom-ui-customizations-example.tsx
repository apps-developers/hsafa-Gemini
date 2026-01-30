/**
 * Custom UI Customizations Example
 * 
 * This example demonstrates the customization features:
 * 1. Custom Tool UI with HsafaUI (receives addToolResult automatically)
 * 2. Custom Edit Modal
 * 3. Component Above Chat Input
 */

import React, { useState } from 'react';
import { HsafaChat, CustomToolUIRenderProps, CustomEditModalRenderProps, Attachment } from '../src';

// ============================================================================
// 1. Custom Tool UI - Interactive Choice Component
// ============================================================================

function InteractiveChoiceUI({ 
  toolName, 
  toolCallId, 
  input, 
  output, 
  status, 
  addToolResult 
}: CustomToolUIRenderProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const options = input?.options || ['Option 1', 'Option 2', 'Option 3'];
  const question = input?.question || 'Please make a selection:';
  
  const handleSelect = (option: string) => {
    setSelectedOption(option);
    
    // Send result back to the agent
    addToolResult({
      tool: toolName,
      toolCallId: toolCallId,
      output: {
        selected: option,
        timestamp: new Date().toISOString(),
      }
    });
  };
  
  return (
    <div style={{
      padding: '16px',
      backgroundColor: '#F3F4F6',
      borderRadius: '12px',
      border: '2px solid #E5E7EB'
    }}>
      <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 600 }}>
        {question}
      </h4>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {options.map((option: string, idx: number) => (
          <button
            key={idx}
            onClick={() => handleSelect(option)}
            disabled={selectedOption !== null}
            style={{
              padding: '12px 16px',
              backgroundColor: selectedOption === option ? '#10B981' : '#FFFFFF',
              color: selectedOption === option ? '#FFFFFF' : '#111827',
              border: selectedOption === option ? '2px solid #059669' : '2px solid #E5E7EB',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: selectedOption ? 'default' : 'pointer',
              transition: 'all 0.2s',
              textAlign: 'left'
            }}
          >
            {selectedOption === option && '✓ '}
            {option}
          </button>
        ))}
      </div>
      
      {selectedOption && (
        <div style={{
          marginTop: '12px',
          padding: '8px 12px',
          backgroundColor: '#D1FAE5',
          color: '#065F46',
          borderRadius: '6px',
          fontSize: '13px',
          fontWeight: 500
        }}>
          ✓ Selection sent to agent: {selectedOption}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 2. Custom Tool UI - Approval Component
// ============================================================================

function ApprovalUI({ 
  toolName, 
  toolCallId, 
  input, 
  addToolResult 
}: CustomToolUIRenderProps) {
  const [decision, setDecision] = useState<'approved' | 'rejected' | null>(null);
  const [comment, setComment] = useState('');
  
  const handleDecision = (approved: boolean) => {
    const decisionType = approved ? 'approved' : 'rejected';
    setDecision(decisionType);
    
    addToolResult({
      tool: toolName,
      toolCallId: toolCallId,
      output: {
        approved,
        comment: comment || undefined,
        decidedAt: new Date().toISOString(),
      }
    });
  };
  
  return (
    <div style={{
      padding: '16px',
      backgroundColor: '#FEF3C7',
      borderRadius: '12px',
      border: '2px solid #FCD34D'
    }}>
      <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 600 }}>
        ⚠️ Approval Required
      </h4>
      <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#78350F' }}>
        {input?.message || 'This action requires your approval.'}
      </p>
      
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Optional comment..."
        disabled={decision !== null}
        style={{
          width: '100%',
          padding: '8px',
          fontSize: '13px',
          borderRadius: '6px',
          border: '1px solid #D97706',
          marginBottom: '12px',
          fontFamily: 'inherit',
          resize: 'vertical',
          minHeight: '60px'
        }}
      />
      
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => handleDecision(true)}
          disabled={decision !== null}
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor: decision === 'approved' ? '#10B981' : '#34D399',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: decision ? 'default' : 'pointer'
          }}
        >
          {decision === 'approved' ? '✓ Approved' : 'Approve'}
        </button>
        <button
          onClick={() => handleDecision(false)}
          disabled={decision !== null}
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor: decision === 'rejected' ? '#EF4444' : '#F87171',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: decision ? 'default' : 'pointer'
          }}
        >
          {decision === 'rejected' ? '✗ Rejected' : 'Reject'}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// 3. Custom Edit Modal
// ============================================================================

function CustomEditModal({
  message,
  text,
  attachments,
  onTextChange,
  onSave,
  onCancel,
  onAddAttachments,
  onRemoveAttachment,
  uploading
}: CustomEditModalRenderProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const handleFileClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      await onAddAttachments(e.target.files);
    }
  };
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#1F2937',
        padding: '24px',
        borderRadius: '16px',
        maxWidth: '700px',
        width: '100%',
        maxHeight: '85vh',
        overflow: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px'
        }}>
          <h2 style={{ 
            margin: 0, 
            fontSize: '20px', 
            fontWeight: 700,
            color: '#F9FAFB'
          }}>
            ✏️ Edit Message
          </h2>
          <button
            onClick={onCancel}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              color: '#9CA3AF',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            ×
          </button>
        </div>
        
        {/* Textarea */}
        <textarea
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          autoFocus
          style={{
            width: '100%',
            minHeight: '150px',
            padding: '12px',
            backgroundColor: '#374151',
            color: '#F9FAFB',
            border: '2px solid #4B5563',
            borderRadius: '8px',
            fontSize: '15px',
            fontFamily: 'inherit',
            resize: 'vertical',
            lineHeight: '1.6'
          }}
          placeholder="Edit your message..."
        />
        
        {/* Attachments Section */}
        {(attachments.length > 0 || true) && (
          <div style={{ marginTop: '16px' }}>
            <h3 style={{ 
              fontSize: '14px', 
              fontWeight: 600, 
              marginBottom: '8px',
              color: '#D1D5DB'
            }}>
              📎 Attachments ({attachments.length})
            </h3>
            
            {attachments.map((att) => (
              <div key={att.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                backgroundColor: '#374151',
                borderRadius: '8px',
                marginBottom: '6px'
              }}>
                <span style={{ 
                  flex: 1, 
                  fontSize: '13px',
                  color: '#F9FAFB',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {att.name}
                </span>
                <button
                  onClick={() => onRemoveAttachment(att.id)}
                  style={{
                    padding: '4px 12px',
                    backgroundColor: '#DC2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 500
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
            
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            
            <button
              onClick={handleFileClick}
              disabled={uploading}
              style={{
                marginTop: '8px',
                padding: '8px 16px',
                backgroundColor: '#4B5563',
                color: '#F9FAFB',
                border: '2px dashed #6B7280',
                borderRadius: '8px',
                cursor: uploading ? 'default' : 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                width: '100%'
              }}
            >
              {uploading ? 'Uploading...' : '+ Add Files'}
            </button>
          </div>
        )}
        
        {/* Message Info */}
        <div style={{
          marginTop: '16px',
          padding: '12px',
          backgroundColor: '#374151',
          borderRadius: '8px',
          fontSize: '12px',
          color: '#9CA3AF'
        }}>
          <p style={{ margin: '0 0 4px 0' }}>
            <strong style={{ color: '#D1D5DB' }}>Message ID:</strong> {message.id}
          </p>
          {message.createdAt && (
            <p style={{ margin: 0 }}>
              <strong style={{ color: '#D1D5DB' }}>Created:</strong>{' '}
              {new Date(message.createdAt).toLocaleString()}
            </p>
          )}
        </div>
        
        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginTop: '24px'
        }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: '#4B5563',
              color: '#F9FAFB',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            style={{
              flex: 2,
              padding: '12px',
              backgroundColor: '#3B82F6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            💾 Save & Regenerate
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 4. Component Above Chat Input
// ============================================================================

function QuickActionsBar() {
  const quickActions = [
    { emoji: '📝', label: 'Summarize', action: 'summarize' },
    { emoji: '🔍', label: 'Analyze', action: 'analyze' },
    { emoji: '💡', label: 'Suggest', action: 'suggest' },
    { emoji: '🌐', label: 'Translate', action: 'translate' },
  ];
  
  return (
    <div style={{
      padding: '12px',
      backgroundColor: '#1F2937',
      borderRadius: '8px',
      marginBottom: '12px',
      border: '1px solid #374151'
    }}>
      <p style={{
        fontSize: '11px',
        color: '#9CA3AF',
        marginBottom: '8px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        Quick Actions
      </p>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {quickActions.map((action) => (
          <button
            key={action.action}
            onClick={() => console.log('Quick action:', action.action)}
            style={{
              padding: '6px 12px',
              backgroundColor: '#374151',
              color: '#F9FAFB',
              border: '1px solid #4B5563',
              borderRadius: '6px',
              fontSize: '13px',
              cursor: 'pointer',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#4B5563';
              e.currentTarget.style.borderColor = '#6B7280';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#374151';
              e.currentTarget.style.borderColor = '#4B5563';
            }}
          >
            <span>{action.emoji}</span>
            <span>{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Main Example Component
// ============================================================================

export default function CustomUICustomizationsExample() {
  return (
    <HsafaChat
      agentId="custom-ui-demo"
      theme="dark"
      
      // Custom Tool UI Components (automatically receive addToolResult)
      HsafaUI={{
        'getUserChoice': InteractiveChoiceUI,
        'requestApproval': ApprovalUI,
      }}
      
      // Custom Edit Modal
      customEditModal={CustomEditModal}
      
      // Component Above Input
      componentAboveInput={QuickActionsBar}
      
      // Example custom tools
      HsafaTools={{
        getUserChoice: async (input: any) => {
          // This tool will use the custom InteractiveChoiceUI
          return { received: true };
        },
        requestApproval: async (input: any) => {
          // This tool will use the custom ApprovalUI
          return { received: true };
        },
      }}
    />
  );
}
