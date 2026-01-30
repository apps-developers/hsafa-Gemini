# Dynamic Page Schemas Guide

> Note: the Dynamic Page subsystem referenced in this document is not present in the current `sdk/src` in this repository.
> This file is kept for historical/reference purposes only.

This guide explains how to use optional Zod schemas and examples with Dynamic Page component types.

## Overview

Dynamic Page types can now include optional **schemas** and **examples** to help the AI agent understand the expected data structure for each component type. When the agent calls `readAvailableTypes`, it receives detailed information about each type including:

- **Type name** and **description**
- **Schema** (JSON Schema format or Zod schema info)
- **Examples** showing valid data structures
- **Variants** (if applicable)

## Adding Schemas to Types

### JSON Schema Format (Recommended)

```typescript
const dynamicPageTypes: DynamicPageTypeConfig[] = [
  {
    type: 'chart',
    component: ChartComponent,
    description: 'Display data as interactive bar charts',
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Chart title' },
        series: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              values: { type: 'array', items: { type: 'number' } }
            },
            required: ['name', 'values']
          }
        }
      },
      required: ['series']
    },
    examples: [
      {
        title: 'Monthly Sales',
        series: [
          { name: '2024', values: [100, 150, 200] },
          { name: '2025', values: [120, 180, 220] }
        ]
      }
    ]
  }
];
```

### Using Zod Schemas

```typescript
import { z } from 'zod';

const chartSchema = z.object({
  title: z.string().optional(),
  series: z.array(z.object({
    name: z.string(),
    values: z.array(z.number())
  }))
});

const dynamicPageTypes: DynamicPageTypeConfig[] = [
  {
    type: 'chart',
    component: ChartComponent,
    description: 'Display data as interactive bar charts',
    schema: chartSchema, // Zod schema will be serialized automatically
    examples: [
      {
        title: 'Monthly Sales',
        series: [
          { name: '2024', values: [100, 150, 200] }
        ]
      }
    ]
  }
];
```

## What the Agent Sees

When calling `readAvailableTypes()`, the agent receives:

```json
{
  "success": true,
  "message": "Found 6 registered component type(s)...",
  "types": [
    {
      "type": "chart",
      "description": "Display data as interactive bar charts with multiple series",
      "variants": ["bar", "line", "area"],
      "has_schema": true,
      "schema": {
        "type": "object",
        "properties": {
          "title": { "type": "string", "description": "Chart title" },
          "series": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "name": { "type": "string" },
                "values": { "type": "array", "items": { "type": "number" } }
              }
            }
          }
        }
      },
      "examples": [
        {
          "title": "Monthly Sales",
          "series": [
            { "name": "2024", "values": [100, 150, 200] }
          ]
        }
      ],
      "example_count": 1
    }
  ],
  "available_types": ["chart", "table", "metric", "text", "progress", "status"],
  "total_count": 6,
  "types_with_schema": 6
}
```

## Benefits

1. **Type Safety**: Agents know exactly what data structure each component expects
2. **Better Errors**: Detailed validation errors when data doesn't match schema
3. **Discoverability**: Agents can explore available types and their requirements
4. **Examples**: Concrete examples help agents understand complex structures
5. **Documentation**: Self-documenting component types

## Best Practices

### 1. Always Provide a Description
```typescript
{
  type: 'metric',
  description: 'Showcase KPIs with large numbers and change indicators', // Clear description
  component: MetricComponent
}
```

### 2. Include Examples for Complex Types
```typescript
{
  type: 'table',
  schema: { /* complex schema */ },
  examples: [
    {
      columns: [
        { key: 'name', title: 'Name' },
        { key: 'value', title: 'Value' }
      ],
      rows: [
        { name: 'Item 1', value: '100' }
      ]
    }
  ]
}
```

### 3. Document Required vs Optional Fields
```typescript
schema: {
  type: 'object',
  properties: {
    value: { type: 'string', description: 'The metric value (required)' },
    label: { type: 'string', description: 'Metric label (required)' },
    change: { type: 'string', description: 'Change indicator (optional)' }
  },
  required: ['value', 'label'] // Explicitly mark required fields
}
```

### 4. Use Enums for Limited Options
```typescript
schema: {
  type: 'object',
  properties: {
    status: {
      type: 'string',
      enum: ['success', 'warning', 'error', 'info'],
      description: 'Status type'
    }
  }
}
```

## Schema Serialization

- **JSON Schema**: Passed through as-is
- **Zod Schema**: Automatically converted to a basic representation with type info
- **Plain Objects**: Treated as JSON Schema

## Example: Complete Type Definition

```typescript
{
  type: 'progress',
  component: ProgressComponent,
  description: 'Show progress bars with percentages and colors',
  schema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        description: 'Array of progress items',
        items: {
          type: 'object',
          properties: {
            label: { type: 'string', description: 'Item label' },
            progress: {
              type: 'number',
              minimum: 0,
              maximum: 100,
              description: 'Progress percentage (0-100)'
            },
            color: { type: 'string', description: 'Optional color' }
          },
          required: ['label', 'progress']
        }
      }
    },
    required: ['items']
  },
  examples: [
    {
      items: [
        { label: 'Task 1', progress: 75, color: '#3b82f6' },
        { label: 'Task 2', progress: 40 }
      ]
    }
  ]
}
```

## Testing Your Schemas

1. Call `readAvailableTypes()` and verify the schema appears correctly
2. Try creating objects with valid data matching the schema
3. Try creating objects with invalid data to test error messages
4. Check that examples render correctly in the UI

## Migration Guide

Existing types without schemas will continue to work. To add schemas:

1. Add a `schema` field to your type config (JSON Schema or Zod)
2. Optionally add `examples` array
3. Rebuild and test with `readAvailableTypes()`

No breaking changes - schemas are purely additive!
