import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  dts: true,
  format: ["esm", "cjs"],
  target: "es2020",
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom", "@tabler/icons-react", "@ai-sdk/react", "ai"],
  treeshake: true,
  minify: true,
  splitting: false,
});
