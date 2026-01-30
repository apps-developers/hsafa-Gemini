/**
 * Dynamic Page Complete Example
 * Shows how to integrate Dynamic Page system with HsafaChat and ContentContainer
 */

import React, { useState } from 'react';
import {
  HsafaProvider,
  HsafaChat,
  ContentContainer,
  DynamicPageTypeConfig,
} from '@hsafa/ui-sdk';

// ============================================================================
// Step 1: Create Your Custom Components
// ============================================================================

// Simple Chart Component
function ChartComponent({ data }: { data: any }) {
  const maxValue = Math.max(
    ...((data.series || []).flatMap((s: any) => s.values || []))
  );

  return (
    <div style={{ width: '100%', height: '100%', padding: '8px' }}>
      <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600 }}>
        {data.title || 'Chart'}
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {(data.series || []).map((series: any, i: number) => (
          <div key={i}>
            <div style={{ fontSize: '12px', marginBottom: '6px', opacity: 0.7 }}>
              {series.name}
            </div>
            <div
              style={{
                display: 'flex',
                gap: '4px',
                alignItems: 'flex-end',
                height: '80px',
              }}
            >
              {(series.values || []).map((value: number, j: number) => (
                <div
                  key={j}
                  style={{
                    flex: 1,
                    backgroundColor: '#3b82f6',
                    height: `${(value / maxValue) * 100}%`,
                    borderRadius: '4px 4px 0 0',
                    minWidth: '20px',
                    position: 'relative',
                  }}
                  title={`${series.name}: ${value}`}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: '-20px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontSize: '11px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Simple Table Component
function TableComponent({ data }: { data: any }) {
  return (
    <div style={{ width: '100%', height: '100%', overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {(data.columns || []).map((col: string, i: number) => (
              <th
                key={i}
                style={{
                  padding: '8px',
                  textAlign: 'left',
                  borderBottom: '2px solid #e5e7eb',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(data.rows || []).map((row: any[], i: number) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td
                  key={j}
                  style={{
                    padding: '8px',
                    borderBottom: '1px solid #e5e7eb',
                    fontSize: '13px',
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Simple Text Component
function TextComponent({ data }: { data: any }) {
  return (
    <div style={{ width: '100%', height: '100%', padding: '16px' }}>
      {data.heading && (
        <h2 style={{ margin: '0 0 12px 0', fontSize: '20px', fontWeight: 700 }}>
          {data.heading}
        </h2>
      )}
      {data.content && (
        <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6 }}>
          {data.content}
        </p>
      )}
    </div>
  );
}

// Metric Card Component
function MetricComponent({ data }: { data: any }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '36px', fontWeight: 700, marginBottom: '8px' }}>
        {data.value}
      </div>
      <div style={{ fontSize: '14px', opacity: 0.7 }}>{data.label}</div>
      {data.change && (
        <div
          style={{
            marginTop: '8px',
            fontSize: '12px',
            color: data.change > 0 ? '#10b981' : '#ef4444',
          }}
        >
          {data.change > 0 ? '↑' : '↓'} {Math.abs(data.change)}%
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Step 2: Register Your Types
// ============================================================================

const dynamicPageTypes: DynamicPageTypeConfig[] = [
  {
    type: 'chart',
    component: ChartComponent,
    description: 'Display data as bar charts with multiple series',
    variants: ['bar', 'line', 'area'],
  },
  {
    type: 'table',
    component: TableComponent,
    description: 'Display data in a tabular format with rows and columns',
  },
  {
    type: 'text',
    component: TextComponent,
    description: 'Display text content with optional heading',
  },
  {
    type: 'metric',
    component: MetricComponent,
    description: 'Display a single metric value with label and change indicator',
  },
];

// ============================================================================
// Step 3: Create Your App Component
// ============================================================================

export function DynamicPageExampleApp() {
  const [agentId] = useState('dynamic-page-demo');

  return (
    <HsafaProvider baseUrl="http://localhost:3000">
      <ContentContainer
        theme="dark"
        enableBorderAnimation={true}
        enableMargin={true}
        chatWidth={420}
      >
        <div
          style={{
            padding: '32px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <h1>Dynamic Page Example</h1>
          <p>
            Try asking the agent to create visualizations! For example:
          </p>
          <ul>
            <li>"Create a 2x2 dashboard grid"</li>
            <li>"Add a sales chart to the top-left area"</li>
            <li>"Show me what types of visualizations you can create"</li>
            <li>"Add a table with customer data to the bottom area"</li>
            <li>"Update the chart to show Q4 data"</li>
          </ul>
        </div>
      </ContentContainer>

      <HsafaChat
        agentId={agentId}
        theme="dark"
        defaultOpen={true}
        dynamicPageTypes={dynamicPageTypes}
      />
    </HsafaProvider>
  );
}

// ============================================================================
// Example Agent Prompts and Expected Behavior
// ============================================================================

/*

EXAMPLE 1: Create a Dashboard
User: "Create a dashboard with 3 rows and 2 columns"
Agent: 
  1. Calls setGrid with gridTemplateColumns: "1fr 1fr", gridTemplateRows: "auto 1fr 1fr"
  2. Returns: "Grid created with 3 rows and 2 columns"

EXAMPLE 2: Add a Chart
User: "Add a sales chart showing monthly data"
Agent:
  1. Calls readAvailableTypes() to see what's available
  2. Calls setObject with:
     {
       object_name: "sales_chart",
       type: "chart",
       data: {
         title: "Monthly Sales",
         series: [{
           name: "Revenue",
           values: [1000, 1200, 1100, 1500]
         }]
       },
       meta: { title: "Sales Chart" }
     }
  3. Returns: "Chart added successfully"

EXAMPLE 3: Update Existing Data
User: "Add December data with value 1800 to the sales chart"
Agent:
  1. Calls editObject with:
     {
       object_name: "sales_chart",
       json_patch: [
         { op: "add", path: "/data/series/0/values/-", value: 1800 }
       ]
     }
  2. Returns: "Chart updated successfully"

EXAMPLE 4: Create Complex Layout
User: "Create a dashboard with header, main chart area, sidebar for metrics, and footer"
Agent:
  1. Calls setGrid with:
     {
       gridTemplateColumns: "2fr 1fr",
       gridTemplateRows: "auto 1fr auto",
       gap: "16px",
       gridTemplateAreas: `
         "header header"
         "main sidebar"
         "footer footer"
       `
     }
  2. Adds multiple objects using setObject for each area
  3. Returns: "Dashboard created with 4 sections"

EXAMPLE 5: Handle Errors Gracefully
User: "Delete the chart named 'nonexistent'"
Agent:
  1. Calls deleteObject({ object_name: "nonexistent" })
  2. Receives: { success: false, message: "Object 'nonexistent' not found..." }
  3. Responds: "I couldn't find a chart named 'nonexistent'. Here are the available objects: ..."

*/

// ============================================================================
// Advanced Example: With State Management
// ============================================================================

export function AdvancedDynamicPageExample() {
  const [chatId, setChatId] = useState(
    `chat_${Date.now()}_${Math.random().toString(36).slice(2)}`
  );

  // You can track when dynamic page opens
  const [dynamicPageActive, setDynamicPageActive] = useState(false);

  return (
    <HsafaProvider baseUrl="http://localhost:3000">
      <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
        {dynamicPageActive && (
          <div
            style={{
              position: 'absolute',
              top: '16px',
              left: '16px',
              zIndex: 1000,
              padding: '8px 16px',
              backgroundColor: '#10b981',
              color: 'white',
              borderRadius: '8px',
              fontSize: '14px',
            }}
          >
            Dynamic Page Active
          </div>
        )}

        <ContentContainer
          theme="dark"
          enableBorderAnimation={true}
        >
          <YourMainApp />
        </ContentContainer>

        <HsafaChat
          agentId="advanced-demo"
          dynamicPageTypes={dynamicPageTypes}
          onDynamicPageChange={(isActive) => setDynamicPageActive(isActive)}
        />
      </div>
    </HsafaProvider>
  );
}

// Placeholder for your main app
function YourMainApp() {
  return (
    <div style={{ padding: '32px' }}>
      <h1>Your Application</h1>
      <p>When the agent creates a dynamic page, it will overlay your content.</p>
    </div>
  );
}

export default DynamicPageExampleApp;
