import React from 'react';

export interface IconWrapperProps {
  IconComponent: any;
  [key: string]: any;
}

/**
 * React 19 compatibility wrapper for Lucide icons
 */
export function IconWrapper({ IconComponent, ...props }: IconWrapperProps) {
  return React.createElement(IconComponent, props);
}
