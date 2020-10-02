const miniforge = require('./main');

miniforge.rootDir(__dirname);

miniforge.build('./main.js', {
  outputNameMin: true,
  compress: true,
  standAlone: true,
  avoidDependencies: false,
});

miniforge.build('./cli.js', {
  outputNameMin: true,
  compress: false,
  standAlone: true,
  avoidDependencies: false,
});

const app = require('./index');
const test = require('./test/test');
test(app);
