const config = {
  plugins: [
    "@tailwindcss/postcss",
    [
      "@csstools/postcss-oklab-function",
      {
        preserve: false,
        subFeatures: {
          displayP3: false,
        },
      },
    ],
  ],
};

export default config;
