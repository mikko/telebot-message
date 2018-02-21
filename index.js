const telegram = require('telegram-bot-api');
const storage = require('@google-cloud/storage')();
const env = require('./env.json');
/**
 * HTTP Cloud Function.
 *
 * @param {Object} req Cloud Function request context.
 * @param {Object} res Cloud Function response context.
 */
exports.messageBot = (req, res) => {
  if (req.method === 'POST') {
    const authHeader = req.get('Authorization');
    if (authHeader === undefined || authHeader.indexOf('Token') === -1 || authHeader.split(' ')[1] === undefined) {
      res.end();
      return;
    }
    const mahBucket = storage.bucket(env.bucketName);
    const file = mahBucket.file(`config.json`);

    file.download()
      .then(data => {
        const servicesConfig = JSON.parse(data.toString());
        const apikey = authHeader.split(' ')[1];
        const serviceName = servicesConfig.services[apikey];
        const legitService = serviceName !== undefined;
        if (legitService) {
          return mahBucket.file(`service_${serviceName}.json`).download();
        }
        res.status(400).send('');
      })
      .then(serviceData => {
        const serviceConfig = JSON.parse(serviceData.toString());
        
        const message = req.body.message; // Message limitations? Length?
        const userHash = req.body.user;

        if (message === undefined || message.length < 4 || message.length > 1000 || userHash === undefined) {
          return res.status(400).send('Invalid payload');
        }

        const userID = serviceConfig.users[userHash];

        if (userID === undefined) {
          return res.status(400).send('Invalid user');
        }

        console.log('Sending user', userID, 'message', message);

        const api = new telegram({
          token: env.botToken,
          updates: {
            enabled: false,
          },
        });
        api.sendMessage({
          chat_id: userID,
          text: message,
        });
      })
      .catch(err => {
        console.log(err);
        res.end();
      });

  } else {
    res.end();
  }
};
