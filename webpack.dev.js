const path = require("path");
const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');

module.exports = merge(common, {
  mode: "development",
  devtool: "eval-source-map",
  devServer: {
    static: './dev',
    devMiddleware: {
      publicPath: '/space-fantasy-football/',
    },
    open: ["/space-fantasy-football/"],
  },
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "dev"),
    clean: true,
  },
});
