import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      "workspace/**",
      "reports/**",
      "formatting-fixtures/**",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/unicode-title-normalizer.js"],
    languageOptions: {
      sourceType: "commonjs",
    },
  },
);
