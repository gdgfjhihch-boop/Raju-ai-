module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // '-core' लगाना बहुत जरूरी है
      'react-native-worklets-core/plugin',
    ],
  };
};
