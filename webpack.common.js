const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  entry: {
    main: "./src/index.ts",
    "sim-worker": "./src/game-sim/sim-worker.ts",
  },
  output: {
    publicPath: "/space-fantasy-football/",
  },
  experiments: {
    topLevelAwait: true,
  },
  plugins: [new HtmlWebpackPlugin()],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        loader: "css-loader",
        options: {
          sourceMap: false,
          exportType: "string",
        },
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif|webp)$/i,
        type: "asset/resource",
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
};
