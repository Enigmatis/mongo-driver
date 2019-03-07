import { DbConnection, GraphqlLogger } from '@enigmatis/utills';
import * as mongoose from 'mongoose';

export declare type MongooseDebugFunction = (
    coll: string,
    method: string,
    query: string,
    doc: string,
) => void;

export interface MongooseConnectionParams {
    connectionString: string;
    waitUntilReconnectInMs?: number;
}

let wantToDisconnect = false;
let isSubscribed = false;

export const initConnection = async (
    options: MongooseConnectionParams,
    logger: GraphqlLogger<any>,
    debug?: MongooseDebugFunction,
) => {
    mongoose.set('debug', (coll: string, method: string, query: string, doc: string) => {
        logger.debug(
            `MONGOOSE: query executed: ${JSON.stringify({
                collection: coll,
                method,
                query,
                doc,
            })}`,
        );
        if (debug) {
            debug(coll, method, query, doc);
        }
    });
    mongoose.set('useFindAndModify', false);
    wantToDisconnect = false;
    if (!isSubscribed) {
        await subscribeToEvents(mongoose.connection, logger, options);
    }
    await connect(options.connectionString);
};

export const closeConnection = async () => {
    wantToDisconnect = true;
    await mongoose.connection.close(true);
};

const connect = async (connectionString: string) => {
    await mongoose.connect(connectionString, {
        autoReconnect: true,
        socketTimeoutMS: 0,
        useNewUrlParser: true,
    });
};

const subscribeToEvents = (
    db: mongoose.Connection,
    logger: GraphqlLogger<any>,
    options: MongooseConnectionParams,
) => {
    db.on('connecting', () => {
        logger.info('Connecting to MongoDB...');
    });
    db.on('error', async error => {
        logger.error(`Error in MongoDb connection: '${error}'`);
    });
    db.on('connected', () => {
        logger.info('MongoDB connected!');
    });
    db.on('open', () => {
        logger.info('MongoDB connection opened!');
    });
    db.on('reconnected', () => {
        logger.warn('MongoDB reconnected!');
    });
    db.on('disconnected', async () => {
        logger.error('MongoDB disconnected!');
        if (!wantToDisconnect) {
            setTimeout(async () => {
                await connect(options.connectionString);
            }, options.waitUntilReconnectInMs || 0);
        }
    });
    isSubscribed = true;
};
