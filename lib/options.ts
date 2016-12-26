import { config } from 'dotenv';
import * as yargs from 'yargs';

const QUEUE_SETTINGS = "Queue settings";
const DATABASE_SETTINGS = "Database settings";

// Load .env file if avaliable
config({
  silent: true
});

export interface TweetPersistOptions extends yargs.Argv {
  queueUrl: string;
  queueSourceName: string;
  queueExpectedAppId: string;
  queueExpectedMessageType: string;
  queueChannelPrefetch: number;

  queueNoMessageSleepTime: number,

  databaseConnectionString: string;
}

export const argv = <TweetPersistOptions>yargs.usage('$0 [args]')
  .env('TWEET_PERSIST')
  .option('queue-url', {
    alias: 'q',
    description: 'RabbitMQ URL',
    required: true,
    type: 'string',
    group: QUEUE_SETTINGS
  })

  .option('queue-source-name', {
    alias: 's',
    description: 'RabbitMQ source queue name',
    default: 'lineofnorth.tweets.northern.persist',
    required: true,
    type: 'string',
    group: QUEUE_SETTINGS
  })
  .option('queue-expected-app-id', {
    description: 'RabbitMQ expected message app id',
    default: 'fetch-tweet',
    required: true,
    type: 'string',
    group: QUEUE_SETTINGS
  })
  .option('queue-expected-message-type', {
    description: 'RabbitMQ expected message type',
    default: 'tweet',
    required: true,
    type: 'string',
    group: QUEUE_SETTINGS
  })
  .option('queue-channel-prefetch', {
    description: 'RabbitMQ channel prefetch setting',
    default: 1000,
    required: true,
    type: 'number',
    group: QUEUE_SETTINGS
  })

  .option('queue-no-message-sleep-time', {
    description: 'Sleep time in milliseconds between consecutive unsuccessful message retrievals',
    default: 1500,
    required: true,
    type: 'number',
    group: QUEUE_SETTINGS
  })

  .option('database-connection-string', {
    description: 'Database connection string',
    required: true,
    type: 'string',
    group: DATABASE_SETTINGS
  })

  .help('h')
  .alias('h', 'help')
  .argv;

export default argv;