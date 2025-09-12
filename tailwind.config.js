module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{js,jsx,ts,tsx}",
    ],

    theme: {
        extend: {
            fontFamily: {
                display: ["Abril Fatface", "cursive"],
        /* Keep serif available explicitly instead of making it the sans stack */
               serifBrand: ["Source Serif Pro", "serif"],
            },
            animation: {
                bounce: 'bounce 0.6s infinite',
                pulse: 'pulse 1.5s ease-in-out infinite'
            }
        },
    },
    plugins: [],
}