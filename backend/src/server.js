const app = require('./app');
const env = require('./config/env');

app.listen(env.port, () => {
  console.log(`AttachTrack API listening on port ${env.port} [${env.nodeEnv}]`);
});
