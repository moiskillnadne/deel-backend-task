import globals from "globals"
import js from "@eslint/js"
import eslintConfigPrettier from "eslint-config-prettier"

export default [{ languageOptions: { globals: globals.node } }, js.configs.recommended, eslintConfigPrettier]
