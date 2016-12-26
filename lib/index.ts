import { Observable } from 'rxjs';
import { config } from 'dotenv';
config({ silent: true });

import createLogger from './logging';
import RabbitMqInputQueue from './queue';
import argv from './options';

const logger = createLogger('lib', 'index');

async function main() {
  let input = await RabbitMqInputQueue.create<any>(argv);

  async function fetchMessage() {
    logger.info(`Attemting to retrieve a tweet`);
    let message = await input.getNextMessage();
    if (message === null) {
      logger.info(`No tweet fetched, waiting ${argv.queueNoMessageSleepTime} ms before re-trying retrieve a message`);
      await Observable.timer(argv.queueNoMessageSleepTime, 0).take(1).toPromise();
    } else {
      logger.info(`Tweet retrieved`, { id: message.id });
      // TODO: Save and ack
    }

    await fetchMessage();
  }

  return await fetchMessage();
}

main().catch(error => {
  logger.error(`An error occured: ${error.message}`, { error });
  process.exit(-1);
});