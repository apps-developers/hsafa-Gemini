import React from "react";
import styles from "./Button.module.css";

/**
 * Props for the Button component
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant of the button */
  variant?: "primary" | "secondary" | "outline" | "ghost";
  /** Size of the button */
  size?: "sm" | "md" | "lg";
  /** Whether the button is in a loading state */
  loading?: boolean;
  /** Content to be displayed inside the button */
  children: React.ReactNode;
}

/**
 * A versatile button component with multiple variants, sizes, and states.
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <Button>Click me</Button>
 * 
 * // With variant and size
 * <Button variant="secondary" size="lg">Large Secondary Button</Button>
 * 
 * // Loading state
 * <Button loading>Processing...</Button>
 * 
 * // With click handler
 * <Button onClick={() => console.log('Clicked!')}>Click me</Button>
 * ```
 */
export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  children,
  className,
  ...props
}) => {
  const buttonClasses = [
    styles.button,
    styles[variant],
    styles[size],
    loading && styles.loading,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      className={buttonClasses}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className={styles.spinner} />}
      <span className={loading ? styles.hiddenText : undefined}>
        {children}
      </span>
    </button>
  );
};
