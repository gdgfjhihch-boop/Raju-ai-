module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // पक्का करें कि यहाँ '-core' लिखा है, यही उस 'लाल स्क्रीन' का इलाज है
      'react-native-worklets-core/plugin',
    ],
  };
};
