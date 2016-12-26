import { Observable } from 'rxjs';
import { config } from 'dotenv';
config({ silent: true });

import createLogger from './logging';
import RabbitMqInputQueue from './queue';
import argv from './options';

const logger = createLogger('lib', 'index');

import * as postgres from 'pg-promise';

export async function connectToDatabase(connectionString: string): Promise<postgres.IConnected<void>> {
  let createDb = postgres();
  let db = await createDb(connectionString);
  return await db.connect();
};

async function main() {
  let [input, dbConn] = await Promise.all([
    RabbitMqInputQueue.create<any>(argv),
    connectToDatabase(argv.databaseConnectionString)
  ]);

  async function fetchMessage() {
    logger.info(`Attemting to retrieve a tweet`);
    let message = await input.getNextMessage();
    if (message === null) {
      logger.info(`No tweet fetched, waiting ${argv.queueNoMessageSleepTime} ms before re-trying retrieve a message`);
      await Observable.timer(argv.queueNoMessageSleepTime, 0).take(1).toPromise();
    } else {
      logger.info(`Tweet retrieved, storing`, { id: message.id });
      let result = await dbConn.query({
        text: `
          INSERT INTO raw_tweets (tweet_id, content) VALUES ($1, $2) 
          ON CONFLICT (tweet_id) DO UPDATE SET content = $2, timestamp = NOW()
        `,
        values: [ message.id, message ],
        name: 'store-tweet'
      });
      logger.info('Tweet stored', { id: message.id });
      message.ack();
    }

    await fetchMessage();
  }

  return await fetchMessage().catch(error => {
    logger.error(`An error occured while fetching tweets: ${error.message}`, { error });
    return false;
  }).then(async () => 
    Promise.all([
      input.close(),
      dbConn.done()
    ])
  );
}

main().catch(error => {
  logger.error(`An error occured: ${error.message}`, { error });
  process.exit(-1);
}).then(success => {
  process.exit(success ? 0 : -1);
})