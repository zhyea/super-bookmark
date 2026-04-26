module.exports = {
    root: true,
    env: {
        browser: true,
        es2022: true,
        node: true,
        webextensions: true
    },
    extends: [
        'eslint:recommended',
        'plugin:vue/vue3-recommended'
    ],
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
    },
    plugins: ['vue'],
    rules: {
        'vue/multi-word-component-names': 'off',
        'vue/require-default-prop': 'off',
        'vue/no-v-html': 'off',
        'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off'
    },
    globals: {
        chrome: 'readonly'
    }
};
