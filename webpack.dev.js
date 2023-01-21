const path = require("path");
const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');

module.exports = merge(common, {
  mode: "development",
  devtool: "eval-source-map",
  devServer: {
    static: './dev',
    devMiddleware: {
      publicPath: '/fg/',
    },
    open: ["/fg/"],
  },
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "dev"),
    clean: true,
  },
});
