import { fileURLToPath, URL } from "node:url";

import eslint from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import importPlugin from "eslint-plugin-import-x";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

const typedFiles = ["apps/**/*.{ts,tsx}", "packages/**/*.{ts,tsx}"];
const repositoryRoot = import.meta.dirname;
const frontendPackageDirectory = fileURLToPath(
  new URL("./apps/frontend", import.meta.url),
);
const backendPackageDirectory = fileURLToPath(
  new URL("./apps/backend", import.meta.url),
);
const contractsPackageDirectory = fileURLToPath(
  new URL("./packages/contracts", import.meta.url),
);

const contractDeepImportPatterns = [
  "@screenpilot/contracts/src",
  "@screenpilot/contracts/src/**",
  "@screenpilot/contracts/dist",
  "@screenpilot/contracts/dist/**",
];

export default tseslint.config(
  {
    ignores: [
      "**/.next/**",
      "**/coverage/**",
      "**/dist/**",
      "**/node_modules/**",
      "**/out/**",
      "**/next-env.d.ts",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    files: typedFiles,
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "import-x": importPlugin,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unsafe-argument": "error",
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-return": "error",
      "import-x/first": "error",
      "import-x/newline-after-import": "error",
      "import-x/no-duplicates": "error",
      "import-x/no-relative-packages": "error",
      "import-x/no-self-import": "error",
      "import-x/no-useless-path-segments": "error",
    },
  },
  {
    ...tseslint.configs.disableTypeChecked,
    files: ["**/*.{cjs,js,mjs}", "**/vitest.config.ts"],
  },
  {
    files: ["apps/frontend/src/**/*.{ts,tsx}"],
    plugins: {
      "@next/next": nextPlugin,
      "react-hooks": reactHooksPlugin,
    },
    settings: {
      next: {
        rootDir: frontendPackageDirectory,
      },
    },
    rules: {
      ...reactHooksPlugin.configs.flat.recommended.rules,
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      "import-x/no-extraneous-dependencies": [
        "error",
        {
          devDependencies: false,
          optionalDependencies: false,
          packageDir: [frontendPackageDirectory],
          peerDependencies: false,
        },
      ],
      "import-x/no-nodejs-modules": "error",
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@screenpilot/backend",
              message: "Frontend code cannot import the backend application.",
            },
            {
              name: "@screenpilot/frontend",
              message:
                "Use the application-local @/* alias for frontend source.",
            },
          ],
          patterns: [
            {
              group: ["@screenpilot/backend/*", "@screenpilot/frontend/*"],
              message:
                "Application package imports cannot cross or self-reference app boundaries.",
            },
            {
              group: ["@/**/../**"],
              message:
                "The frontend @/* alias cannot contain parent-directory traversal.",
            },
            {
              group: contractDeepImportPatterns,
              message:
                "Import only declared @screenpilot/contracts package exports.",
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      "apps/frontend/src/**/*.test.{ts,tsx}",
      "apps/frontend/src/test/**/*.{ts,tsx}",
    ],
    rules: {
      "import-x/no-extraneous-dependencies": [
        "error",
        {
          devDependencies: true,
          optionalDependencies: false,
          packageDir: [frontendPackageDirectory, repositoryRoot],
          peerDependencies: false,
        },
      ],
    },
  },
  {
    files: ["apps/backend/src/**/*.ts"],
    rules: {
      "import-x/no-extraneous-dependencies": [
        "error",
        {
          devDependencies: false,
          optionalDependencies: false,
          packageDir: [backendPackageDirectory],
          peerDependencies: false,
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@screenpilot/backend",
              message:
                "Backend source must use relative imports within its application.",
            },
            {
              name: "@screenpilot/frontend",
              message: "Backend code cannot import the frontend application.",
            },
          ],
          patterns: [
            {
              group: [
                "@/**",
                "@screenpilot/backend/*",
                "@screenpilot/frontend/*",
              ],
              message:
                "Aliases are application-local and applications cannot import one another.",
            },
            {
              group: contractDeepImportPatterns,
              message:
                "Import only declared @screenpilot/contracts package exports.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["apps/backend/src/**/*.test.ts"],
    rules: {
      "import-x/no-extraneous-dependencies": [
        "error",
        {
          devDependencies: true,
          optionalDependencies: false,
          packageDir: [backendPackageDirectory, repositoryRoot],
          peerDependencies: false,
        },
      ],
    },
  },
  {
    files: ["packages/contracts/src/**/*.ts"],
    rules: {
      "import-x/no-extraneous-dependencies": [
        "error",
        {
          devDependencies: false,
          optionalDependencies: false,
          packageDir: [contractsPackageDirectory],
          peerDependencies: false,
        },
      ],
      "import-x/no-nodejs-modules": "error",
      "no-restricted-globals": [
        "error",
        {
          name: "Buffer",
          message: "Shared contracts must remain browser-safe.",
        },
        {
          name: "process",
          message: "Shared contracts cannot read server environment state.",
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@screenpilot/backend",
              message: "Shared contracts cannot import application code.",
            },
            {
              name: "@screenpilot/contracts",
              message:
                "Shared contracts must use relative imports within the package.",
            },
            {
              name: "@screenpilot/frontend",
              message: "Shared contracts cannot import application code.",
            },
            {
              name: "express",
              message: "Shared contracts cannot import server frameworks.",
            },
            {
              name: "next",
              message: "Shared contracts cannot import application frameworks.",
            },
            {
              name: "react",
              message: "Shared contracts cannot import application frameworks.",
            },
          ],
          patterns: [
            {
              group: [
                "@/**",
                "@screenpilot/backend/*",
                "@screenpilot/contracts/*",
                "@screenpilot/frontend/*",
                "express/*",
                "next/*",
                "react/*",
              ],
              message:
                "Contracts are a browser-safe dependency leaf and use package-relative imports only.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["packages/contracts/src/**/*.test.ts"],
    rules: {
      "import-x/no-extraneous-dependencies": [
        "error",
        {
          devDependencies: true,
          optionalDependencies: false,
          packageDir: [contractsPackageDirectory, repositoryRoot],
          peerDependencies: false,
        },
      ],
    },
  },
);
