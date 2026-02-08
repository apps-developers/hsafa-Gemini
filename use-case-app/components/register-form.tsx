"use client";

import { useState } from "react";
import {
  UserPlusIcon,
  LogInIcon,
  LoaderIcon,
  SparklesIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  entityId: string;
  smartSpaceId: string;
  agentEntityId: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

interface AuthFormProps {
  onAuth: (session: AuthSession) => void;
}

export function AuthForm({ onAuth }: AuthFormProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLogin = mode === "login";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const endpoint = isLogin ? "/api/login" : "/api/register";
      const payload = isLogin ? { email, password } : { name, email, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || (isLogin ? "Login failed" : "Registration failed"));
      }

      onAuth(data as AuthSession);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <SparklesIcon className="size-7" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {isLogin ? "Welcome back" : "Welcome to Hsafa"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isLogin
              ? "Sign in to continue chatting with your AI assistant"
              : "Create an account to start chatting with your AI assistant"}
          </p>
        </div>

        {/* Form Card */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-2">
                <label
                  htmlFor="name"
                  className="text-sm font-medium text-foreground"
                >
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  required={!isLogin}
                  className={cn(
                    "flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm",
                    "placeholder:text-muted-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring",
                    "transition-colors"
                  )}
                />
              </div>
            )}

            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-foreground"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                required
                className={cn(
                  "flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm",
                  "placeholder:text-muted-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring",
                  "transition-colors"
                )}
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-medium text-foreground"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isLogin ? "Enter your password" : "Min 6 characters"}
                required
                minLength={6}
                className={cn(
                  "flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm",
                  "placeholder:text-muted-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring",
                  "transition-colors"
                )}
              />
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading || !email || !password || (!isLogin && !name)}
              className="w-full h-10"
            >
              {isLoading ? (
                <LoaderIcon className="size-4 animate-spin" />
              ) : isLogin ? (
                <LogInIcon className="size-4" />
              ) : (
                <UserPlusIcon className="size-4" />
              )}
              {isLoading
                ? isLogin
                  ? "Signing in..."
                  : "Setting up your space..."
                : isLogin
                  ? "Sign In"
                  : "Create Account"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => {
                setMode(isLogin ? "register" : "login");
                setError(null);
                setPassword("");
              }}
              className="font-medium text-primary hover:underline"
            >
              {isLogin ? "Create one" : "Sign in"}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          {isLogin
            ? "We'll find your existing space and reconnect you."
            : "This creates an entity, a SmartSpace, and pairs you with an AI assistant."}
        </p>
      </div>
    </div>
  );
}
