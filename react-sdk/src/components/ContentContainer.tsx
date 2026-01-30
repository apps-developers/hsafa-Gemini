import React, { useEffect, useRef, useState } from "react";
import { useHsafa } from "../providers/HsafaProvider";
import { ThemeColors, themeColors } from "../utils/chat-theme";

export interface ContentContainerProps {
  children: React.ReactNode;
  theme?: "dark" | "light";
  primaryColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  mutedTextColor?: string;
  enableBorderAnimation?: boolean;
  borderRadius?: number | string;
  enableContentBorder?: boolean;
  className?: string;
  enableMargin?: boolean; // Enable/disable margin when chat is open
  chatWidth?: number | string; // Width of the chat panel (default: 420)
  dir?: "ltr" | "rtl"; // Text direction for margin side
}

/**
 * ContentContainer component that wraps your content and applies animations
 * based on HsafaChat state (streaming and open state).
 *
 * Features:
 * - Detects if any chat under HsafaProvider is streaming and applies border animation
 * - Detects if any HsafaChat is open and applies radius, border, and margin with animation
 * - Automatically adjusts margin based on chat width and direction (RTL/LTR)
 *
 * @example
 * ```tsx
 * // Basic usage
 * <HsafaProvider baseUrl="http://localhost:3000">
 *   <ContentContainer theme="dark" enableBorderAnimation>
 *     <YourApp />
 *   </ContentContainer>
 *   <HsafaChat agentId="agent-1" width={450} />
 * </HsafaProvider>
 *
 * // With custom chat width and RTL support
 * <HsafaProvider baseUrl="http://localhost:3000">
 *   <ContentContainer 
 *     theme="dark" 
 *     chatWidth={450}
 *     dir="rtl"
 *     enableMargin={true}
 *   >
 *     <YourApp />
 *   </ContentContainer>
 *   <HsafaChat agentId="agent-1" width={450} dir="rtl" />
 * </HsafaProvider>
 *
 * // Disable margin (content stays full width)
 * <HsafaProvider baseUrl="http://localhost:3000">
 *   <ContentContainer enableMargin={false}>
 *     <YourApp />
 *   </ContentContainer>
 *   <HsafaChat agentId="agent-1" />
 * </HsafaProvider>
 * ```
 */
export function ContentContainer({
  children,
  theme = "dark",
  primaryColor,
  backgroundColor,
  borderColor,
  textColor,
  mutedTextColor,
  enableBorderAnimation = true,
  borderRadius = 16,
  enableContentBorder = true,
  className = "",
  enableMargin = true,
  chatWidth = 420,
  dir = "ltr",
}: ContentContainerProps) {
  const { isAnyStreaming, isAnyChatOpen, dir: providerDir, theme: providerTheme } = useHsafa();
  // Use provider defaults if props are not explicitly provided
  const effectiveDir = (dir ?? providerDir) || 'ltr';
  const effectiveTheme = (theme ?? providerTheme) || 'dark';
  const componentId = useRef(
    `content-container-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );
  
  // Track if this is the initial mount to prevent transition animation on load
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    // Defer setting mounted to next frame to allow chat to report its state
    const timeout = setTimeout(() => setIsMounted(true), 50);
    return () => clearTimeout(timeout);
  }, []);

  // Theme resolution
  const themeColorScheme = themeColors[effectiveTheme as 'dark' | 'light'];
  const resolvedColors: ThemeColors = {
    primaryColor: primaryColor || themeColorScheme.primaryColor,
    backgroundColor: backgroundColor || themeColorScheme.backgroundColor,
    borderColor: borderColor || themeColorScheme.borderColor,
    textColor: textColor || themeColorScheme.textColor,
    accentColor: themeColorScheme.accentColor,
    mutedTextColor: mutedTextColor || themeColorScheme.mutedTextColor,
    inputBackground: themeColorScheme.inputBackground,
    cardBackground: themeColorScheme.cardBackground,
    hoverBackground: themeColorScheme.hoverBackground,
    errorColor: themeColorScheme.errorColor,
    errorColorLight: themeColorScheme.errorColorLight,
    errorColorDark: themeColorScheme.errorColorDark,
    successColor: themeColorScheme.successColor,
    successColorLight: themeColorScheme.successColorLight,
    warningColor: themeColorScheme.warningColor,
    warningColorLight: themeColorScheme.warningColorLight,
    infoColor: themeColorScheme.infoColor,
    infoColorLight: themeColorScheme.infoColorLight,
    dangerColor: themeColorScheme.dangerColor,
    dangerColorLight: themeColorScheme.dangerColorLight,
    dangerColorDark: themeColorScheme.dangerColorDark,
  };

  const contentBorderRadius =
    typeof borderRadius === "number" ? `${borderRadius}px` : borderRadius;

  // Calculate margin and width based on chat width and direction
  const chatWidthPx = typeof chatWidth === "number" ? `${chatWidth}px` : chatWidth;
  const marginStyle = enableMargin && isAnyChatOpen
    ? effectiveDir === "rtl"
      ? { marginLeft: chatWidthPx }
      : { marginRight: chatWidthPx }
    : {};
  
  const containerWidth = enableMargin && isAnyChatOpen 
    ? `calc(100% - ${chatWidthPx})` 
    : "100%";

  return (
    <>
      <div
        className={className}
        style={{
          width: containerWidth,
          height: "100%",
          transition: isMounted ? "all 0.2s ease-out" : "none",
          padding: isAnyChatOpen && enableContentBorder ? "16px" : "0",
          ...marginStyle,
        }}
      >
       <div
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              transition: isMounted ? 'all 0.2s ease-out' : 'none',
              borderRadius: isAnyChatOpen ? contentBorderRadius : '0',
              border: isAnyChatOpen && isAnyStreaming && enableBorderAnimation ? 'none' : isAnyChatOpen ? `1px solid ${resolvedColors.borderColor}` : 'none',
              padding: isAnyChatOpen && isAnyStreaming && enableBorderAnimation ? '1.5px' : '0',
              background: isAnyChatOpen && isAnyStreaming && enableBorderAnimation ?
                `linear-gradient(120deg, ${resolvedColors.primaryColor}dd 0%, ${resolvedColors.primaryColor}88 25%, ${resolvedColors.primaryColor}00 50%, ${resolvedColors.primaryColor}88 75%, ${resolvedColors.primaryColor}dd 100%)` :
                'transparent',
              backgroundSize: isAnyChatOpen && isAnyStreaming && enableBorderAnimation ? '300% 300%' : 'auto',
              animation: isAnyChatOpen && isAnyStreaming && enableBorderAnimation ? `${componentId.current}-border-flow 3s ease-in-out infinite` : 'none',
              filter: isAnyChatOpen && isAnyStreaming && enableBorderAnimation ? `drop-shadow(0 0 10px ${resolvedColors.primaryColor}40)` : 'none'
            }}
          >
            <div
              className="hsafa-content-container"
              style={{
                width: '100%',
                height: '100%',
                borderRadius: isAnyChatOpen && enableContentBorder ? contentBorderRadius : '0',
                backgroundColor: isAnyChatOpen && enableContentBorder ? resolvedColors.backgroundColor : 'transparent',
                overflow: 'auto',
                position: 'relative',
                isolation: 'isolate',
                contain: 'layout style paint',
                transform: 'translateZ(0)',
                scrollbarWidth: 'thin',
                scrollbarColor: `${resolvedColors.mutedTextColor}40 transparent`
              }}
            >
              {children}
            </div>
          </div>
      </div>
      <style>
        {`
            @keyframes ${componentId.current}-border-flow {
               0% { background-position: 0% 50%; }
             50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
       }
         `}
      </style>{" "}
    </>
  );
}
