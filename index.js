const express = require('express');
const line = require('@line/bot-sdk');

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
};

const app = express();

app.get('/', (req, res) => {
  res.send('LINE Bot OK');
});

app.post('/webhook', line.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

const client = new line.Client(config);

function handleEvent(event) {
  if (event.type !== 'message') {
    return Promise.resolve(null);
  }

  if (event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const text = event.message.text;

  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: `你說的是：${text}`
  });
}

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server running on ${port}`);
});
