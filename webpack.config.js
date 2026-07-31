const { webpack } = require('@nestjs/cli');

module.exports = function (options, webpackInstance) {
  return {
    ...options,
    // Stop Webpack from treating this ESM module as an external dependency
    externals: Array.isArray(options.externals)
      ? options.externals.filter(
          (ext) => !ext.toString().includes('@workflow/nest'),
        )
      : options.externals,

    plugins: [
      ...options.plugins,

      // Example: Using a plugin to inject environment flags if required by the ESM package
      new webpackInstance.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(
          process.env.NODE_ENV || 'production',
        ),
      }),
    ],

    module: {
      ...options.module,
      rules: [
        ...options.module.rules,
        {
          // Ensure Webpack can parse and compile modern JS inside the ESM package
          test: /\.js$/,
          include: /node_modules\/@workflow\/nest/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', { targets: { node: 'current' } }],
              ],
            },
          },
        },
      ],
    },
  };
};
