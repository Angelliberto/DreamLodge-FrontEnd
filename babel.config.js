module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    // Must be last: required by react-native-reanimated (used by Gifted Chat, etc.)
    plugins: ["react-native-reanimated/plugin"],
  };
};