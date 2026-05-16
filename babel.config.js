module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // Required for WatermelonDB model decorators (@field, @date, @relation)
    ['@babel/plugin-proposal-decorators', { legacy: true }],
  ],
};
