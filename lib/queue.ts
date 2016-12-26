import { connect, Connection, Channel, Message } from 'amqplib';

import { createLogger, Logger } from './logging';

export type ConnectionFactory = (url: string) => Promise<Connection>;
async function defaultConnectionFactory(url: string) {
  return await connect(url);
}


export interface QueueSettings {
  queueUrl: string;
  queueSourceName: string;
  queueExpectedAppId: string;
  queueExpectedMessageType: string;
  queueChannelPrefetch: number;
}

export interface Serializer {
  supports(contentType: string): boolean;
  deserialize<TData>(message: Message): TData;
}

class JsonSerializer implements Serializer {
  public supports(contentType: string): boolean {
    return contentType === 'application/json';
  }

  public deserialize<TData>(message: Message): TData {
    let { contentType, contentEncoding, appId, type } = message.properties;

    if (contentType !== 'application/json') {
      throw new Error(`Unsupported content type ${contentType}`);
    }

    let text = message.content.toString(contentEncoding);
    return JSON.parse(text);
  };
}

export interface InputQueue<TData> {
  getNextMessage(): Promise<TData>;
  close(): Promise<void>
}

export interface TransferedMessage {
  ack();
  nack();
}

class RabbitMqInputQueue<TData> implements InputQueue<TData> {
  private constructor(
    private _connection: Connection,
    private _channel: Channel,
    private _serializer: Serializer,
    private _logger: Logger,
    private _queueName: string,
    private _expectedAppId: string,
    private _expectedMessageType: string
  ) { }

  public async getNextMessage(): Promise<TData & TransferedMessage> {
    let message = await this._channel.get(this._queueName);
    if (typeof message === 'boolean') {
      return null;
    }

    let { appId, type, contentType, contentEncoding } = message.properties;

    if (!this._serializer.supports(contentType)) {
      this._logger.warn(`Recieved message with unsupported content type: ${contentType}. The message will be ignored.`);
      this._channel.nack(message);
      return null;
    }

    if (this._expectedAppId !== appId) {
      this._logger.warn(`Recieved message with unsupported app id: ${appId}, expected: ${this._expectedAppId}. The message will be ignored.`);
      this._channel.nack(message);
      return null;
    }

    if (this._expectedMessageType !== type) {
      this._logger.warn(`Recieved message with unsupported type: ${type}, expected: ${this._expectedMessageType}. The message will be ignored.`);
      this._channel.nack(message);
      return null;
    }

    this._logger.info('Message recieved', message.properties);
    let messageContent = this._serializer.deserialize<TData>(message);
    this._logger.info('Message deserialized');
    return Object.assign(messageContent, {
      ack: () => this._channel.ack(<Message>message),
      nack: () => this._channel.nack(<Message>message)
    });
  }

  public async close() {
    await this._channel.close();
    this._logger.info('Channel closed');

    await this._connection.close();
    this._logger.info('Connection closed');
  }

  public static async create<TData>(
    settings: QueueSettings,
    connectionFactory: ConnectionFactory = defaultConnectionFactory
  ): Promise<RabbitMqInputQueue<TData>> {
    let { queueUrl, queueSourceName, queueExpectedAppId, queueExpectedMessageType, queueChannelPrefetch } = settings;

    let logger = createLogger('lib', 'queue', `queue: ${queueSourceName}`);
    
    let connection = await connectionFactory(queueUrl);
    logger.info('Connected to queue', { queueUrl });

    let channel = await connection.createChannel();
    await channel.prefetch(queueChannelPrefetch);
    logger.info(`Channel created, prefetch set to ${queueChannelPrefetch}`);

    let queue = channel.checkQueue(queueSourceName);
    logger.info('Ready to recieve messages from queue');

    return new RabbitMqInputQueue(
      connection,
      channel,
      new JsonSerializer(),
      logger,
      queueSourceName,
      queueExpectedAppId,
      queueExpectedMessageType
    );
  }
}

export default RabbitMqInputQueue;