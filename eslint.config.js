import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import react from 'eslint-plugin-react';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
    { ignores: ['dist', 'node_modules', 'dist-electron', 'release', 'output', 'playwright-report', 'test-results', 'legacy_archive', 'scratch', '.next', '.turbo'] },
    {
        extends: [js.configs.recommended, ...tseslint.configs.recommended, prettierConfig],
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
            ecmaVersion: 2020,
            globals: globals.browser,
        },
        plugins: {
            'react-hooks': reactHooks,
            react,
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            'react/react-in-jsx-scope': 'off',
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            'no-console': ['warn', { allow: ['warn', 'error'] }],
            '@typescript-eslint/ban-ts-comment': 'off',
            'react-hooks/set-state-in-effect': 'warn',
            'react-hooks/preserve-manual-memoization': 'warn',
            'react-hooks/refs': 'warn',
            'no-case-declarations': 'warn',
            'prefer-const': 'warn',
        },
        settings: {
            react: {
                version: 'detect',
            },
        },
    },
    {
        files: ['src/**/*.{ts,tsx}'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            // Prevents accessing internal directories of features (more than 1 level deep under features)
                            // Correct: "@/features/settings" or "../../features/settings"
                            // Violation: "@/features/settings/components/VersionsTab"
                            group: [
                                // Block relative deep imports crossing features
                                '**/features/*/*/**',
                                
                                // Block alias deep imports
                                '@/features/*/*/**',
                            ],
                            message: 'Cross-feature imports must use the feature\'s public API (e.g., "@/features/feature-name" or "../../features/feature-name"). Importing internal directories of other features is strictly prohibited.'
                        }
                    ]
                }
            ]
        }
    }
);
