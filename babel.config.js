module.exports = {
  presets: [
    [
      '@react-native/babel-preset',
      {
        hermesParserOptions: {
          enableExperimentalComponentSyntax: true,
        },
      },
    ],
  ],
};
