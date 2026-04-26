module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true
  },
  ignorePatterns: ["dist/", "coverage/", "playwright-report/", ".vite/"],
  overrides: [
    {
      files: ["**/*.ts"],
      parser: "@typescript-eslint/parser",
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module"
      },
      plugins: ["@typescript-eslint"],
      extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"]
    },
    {
      files: ["**/*.js", "**/*.cjs", "**/*.mjs"],
      extends: ["eslint:recommended"],
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module"
      }
    }
  ]
};
