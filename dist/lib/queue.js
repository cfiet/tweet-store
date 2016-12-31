"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const amqplib_1 = require("amqplib");
const logging_1 = require("./logging");
function defaultConnectionFactory(url) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield amqplib_1.connect(url);
    });
}
class JsonSerializer {
    supports(contentType) {
        return contentType === 'application/json';
    }
    deserialize(message) {
        let { contentType, contentEncoding, appId, type } = message.properties;
        if (contentType !== 'application/json') {
            throw new Error(`Unsupported content type ${contentType}`);
        }
        let text = message.content.toString(contentEncoding);
        return JSON.parse(text);
    }
    ;
}
class RabbitMqInputQueue {
    constructor(_connection, _channel, _serializer, _logger, _queueName, _expectedAppId, _expectedMessageType) {
        this._connection = _connection;
        this._channel = _channel;
        this._serializer = _serializer;
        this._logger = _logger;
        this._queueName = _queueName;
        this._expectedAppId = _expectedAppId;
        this._expectedMessageType = _expectedMessageType;
    }
    getNextMessage() {
        return __awaiter(this, void 0, void 0, function* () {
            let message = yield this._channel.get(this._queueName);
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
            let messageContent = this._serializer.deserialize(message);
            this._logger.info('Message deserialized');
            return Object.assign(messageContent, {
                ack: () => this._channel.ack(message),
                nack: () => this._channel.nack(message)
            });
        });
    }
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this._channel.close();
            this._logger.info('Channel closed');
            yield this._connection.close();
            this._logger.info('Connection closed');
        });
    }
    static create(settings, connectionFactory = defaultConnectionFactory) {
        return __awaiter(this, void 0, void 0, function* () {
            let { queueUrl, queueSourceName, queueExpectedAppId, queueExpectedMessageType, queueChannelPrefetch } = settings;
            let logger = logging_1.createLogger('lib', 'queue', `queue: ${queueSourceName}`);
            let connection = yield connectionFactory(queueUrl);
            logger.info('Connected to queue', { queueUrl });
            let channel = yield connection.createChannel();
            yield channel.prefetch(queueChannelPrefetch);
            logger.info(`Channel created, prefetch set to ${queueChannelPrefetch}`);
            let queue = channel.checkQueue(queueSourceName);
            logger.info('Ready to recieve messages from queue');
            return new RabbitMqInputQueue(connection, channel, new JsonSerializer(), logger, queueSourceName, queueExpectedAppId, queueExpectedMessageType);
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = RabbitMqInputQueue;
//# sourceMappingURL=queue.js.map