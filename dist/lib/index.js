"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const rxjs_1 = require("rxjs");
const dotenv_1 = require("dotenv");
dotenv_1.config({ silent: true });
const logging_1 = require("./logging");
const queue_1 = require("./queue");
const options_1 = require("./options");
const logger = logging_1.default('lib', 'index');
const postgres = require("pg-promise");
function connectToDatabase(connectionString) {
    return __awaiter(this, void 0, void 0, function* () {
        let createDb = postgres();
        let db = yield createDb(connectionString);
        return yield db.connect();
    });
}
exports.connectToDatabase = connectToDatabase;
;
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        let [input, dbConn] = yield Promise.all([
            queue_1.default.create(options_1.default),
            connectToDatabase(options_1.default.databaseConnectionString)
        ]);
        function fetchMessage() {
            return __awaiter(this, void 0, void 0, function* () {
                logger.info(`Attemting to retrieve a tweet`);
                let message = yield input.getNextMessage();
                if (message === null) {
                    logger.info(`No tweet fetched, waiting ${options_1.default.queueNoMessageSleepTime} ms before re-trying retrieve a message`);
                    yield rxjs_1.Observable.timer(options_1.default.queueNoMessageSleepTime, 0).take(1).toPromise();
                }
                else {
                    logger.info(`Tweet retrieved, storing`, { id: message.id });
                    let result = yield dbConn.query({
                        text: `
          INSERT INTO raw_tweets (tweet_id, content) VALUES ($1, $2) 
          ON CONFLICT (tweet_id) DO UPDATE SET content = $2, timestamp = NOW()
        `,
                        values: [message.id, message],
                        name: 'store-tweet'
                    });
                    logger.info('Tweet stored', { id: message.id });
                    message.ack();
                }
                yield fetchMessage();
            });
        }
        return yield fetchMessage().catch(error => {
            logger.error(`An error occured while fetching tweets: ${error.message}`, { error });
            return false;
        }).then(() => __awaiter(this, void 0, void 0, function* () {
            return Promise.all([
                input.close(),
                dbConn.done()
            ]);
        }));
    });
}
main().catch(error => {
    logger.error(`An error occured: ${error.message}`, { error });
    process.exit(-1);
}).then(success => {
    process.exit(success ? 0 : -1);
});
//# sourceMappingURL=index.js.map