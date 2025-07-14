module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{js,jsx, jsx, tsx}",
    ],

    theme: {
        extend: {
            fontFamily: {
                display: ["Abril Fatface", 'cursive'],
                sans: ["Source Serif Pro", "serif"]
            },
            animation: {
                bounce: 'bounce 0.6s infinite',
                pulse: 'pulse 1.5s ease-in-out infinite'
            }
        },
    },
    plugins: [],
}