/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                brand: {
                    50: 'var(--color-primary-50)',
                    100: 'var(--color-primary-100)',
                    400: 'var(--color-primary-400)',
                    500: 'var(--color-primary-500)',
                    600: 'var(--color-primary-600)',
                    700: 'var(--color-primary-700)',
                },
                paper: {
                    50: 'var(--surface-app)',
                    100: 'var(--surface-subtle)',
                    200: 'var(--surface-elevated)',
                    300: 'var(--surface-hover)',
                    800: 'var(--text-secondary)',
                    900: 'var(--text-default)',
                },
                app: {
                    bg: 'var(--surface-app)',
                    elevated: 'var(--surface-elevated)',
                    surface: 'var(--surface-panel)',
                    subtle: 'var(--surface-subtle)',
                    border: 'var(--border-soft)',
                    text: 'var(--text-default)',
                    muted: 'var(--text-tertiary)',
                    info: 'var(--color-info-500)',
                    accent: 'var(--color-accent-500)',
                    danger: 'var(--color-danger-500)',
                },
            },
            fontFamily: {
                sans: ['var(--font-family-sans)', 'sans-serif'],
                serif: ['var(--font-family-serif)', 'serif'],
            },
            boxShadow: {
                soft: 'var(--shadow-sm)',
                card: 'var(--shadow-md)',
                float: 'var(--shadow-float)',
            },
        },
    },
    plugins: [],
}
