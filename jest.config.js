module.exports = {
    testMatch: ['**/?(*.)test.ts?(x)'],
    globals: {
        'ts-jest': {
            tsConfig: 'tsconfig.json',
            diagnostics: false,
        },
    },
    testEnvironment: 'jsdom',
};
