const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  mode: "development",
  entry: {
    main: "./src/index.ts",
    "sim-worker": "./src/game-sim/sim-worker.ts",
  },
  devtool: "eval-source-map",
  devServer: {
    static: './dev',
    devMiddleware: {
      publicPath: '/github/',
    },
    open: ["/github/"],
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
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "dev"),
    clean: true,
  },
};
