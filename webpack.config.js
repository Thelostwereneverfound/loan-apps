const path = require('path');
const glob = require('glob');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const INCLUDE_PATTERN = /<include src="(.+)"\s*\/?>(?:<\/include>)?/gi;
const processNestedHtml = (content, loaderContext, dir = null) =>
  !INCLUDE_PATTERN.test(content)
    ? content
    : content.replace(INCLUDE_PATTERN, (m, src) => {
        const filePath = path.resolve(dir || loaderContext.context, src);
        loaderContext.dependency(filePath);
        return processNestedHtml(
          loaderContext.fs.readFileSync(filePath, 'utf8'),
          loaderContext,
          path.dirname(filePath)
        );
      });

// HTML generation
const paths = [];
const generateHTMLPlugins = () => glob.sync('./src/*.html').map((dir) => {
  const filename = path.basename(dir);

  if (filename !== '404.html') {
    paths.push(filename);
  }

  // Special handling for 404.html to redirect to soldifi.com
  const options = {
    filename,
    template: `./src/${filename}`,
    favicon: `./src/images/favi.png`,
    inject: 'body',
  };

  // For 404.html, add a redirect script to soldifi.com
  if (filename === '404.html') {
    options.inject = false; // prevent default injection
    options.templateContent = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Redirecting...</title>
          <script>
            window.location.href = 'https://www.soldifi.com';
          </script>
        </head>
        <body>
          <p>If you are not redirected, <a href="https://www.soldifi.com">click here</a>.</p>
        </body>
      </html>
    `;
  }

  return new HtmlWebpackPlugin(options);
});

module.exports = {
  mode: 'development',
  entry: './src/js/index.js',
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'), // Updated to 'public'
    },
    compress: true,
    port: 3000,
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
      {
        test: /\.css$/i,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: [
                  require('autoprefixer')({
                    overrideBrowserslist: [
                      'last 2 versions',
                      'safari >= 12',
                      'ie >= 11',
                    ],
                  }),
                ],
              },
            },
          },
        ],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
      },
      {
        test: /\.html$/,
        loader: 'html-loader',
        options: {
          preprocessor: processNestedHtml,
        },
      },
    ],
  },
  plugins: [
    ...generateHTMLPlugins(),
    new MiniCssExtractPlugin({
      filename: 'style.css',
      chunkFilename: 'style.css',
    }),
  ],
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'public'), // Updated to 'public'
    clean: true,
    assetModuleFilename: 'images/[name][ext]',
  },
  target: 'web', // fix for "browserslist" error message
  stats: 'errors-only', // suppress irrelevant log messages
};
