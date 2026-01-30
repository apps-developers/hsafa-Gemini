import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";
import styles from "./Button.module.css";

describe("Button", () => {
  it("renders with default props", () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole("button", { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass(styles.button, styles.primary, styles.md);
  });

  it("handles click events", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    
    render(<Button onClick={onClick}>Click me</Button>);
    const button = screen.getByRole("button", { name: /click me/i });
    
    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("applies variant classes correctly", () => {
    const { rerender } = render(<Button variant="secondary">Test</Button>);
    expect(screen.getByRole("button")).toHaveClass(styles.secondary);

    rerender(<Button variant="outline">Test</Button>);
    expect(screen.getByRole("button")).toHaveClass(styles.outline);

    rerender(<Button variant="ghost">Test</Button>);
    expect(screen.getByRole("button")).toHaveClass(styles.ghost);
  });

  it("applies size classes correctly", () => {
    const { rerender } = render(<Button size="sm">Test</Button>);
    expect(screen.getByRole("button")).toHaveClass(styles.sm);

    rerender(<Button size="lg">Test</Button>);
    expect(screen.getByRole("button")).toHaveClass(styles.lg);
  });

  it("shows loading state", () => {
    render(<Button loading>Loading</Button>);
    const button = screen.getByRole("button");
    
    expect(button).toHaveClass(styles.loading);
    expect(button).toBeDisabled();
    expect(button.querySelector(`.${styles.spinner}`)).toBeInTheDocument();
  });

  it("is disabled when disabled prop is true", () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("forwards additional props", () => {
    render(<Button data-testid="custom-button" aria-label="Custom">Test</Button>);
    const button = screen.getByTestId("custom-button");
    
    expect(button).toHaveAttribute("aria-label", "Custom");
  });
});
