import { DbConnection, GraphqlLogger } from '@enigmatis/utills';
import * as mongoose from 'mongoose';

export interface MongooseConnectionParams {
    connectionString: string;
    waitUntilReconnectInMs?: number;
}

export class MongooseConnection implements DbConnection {
    private wantToDisconnect = false;
    private isSubscribed = false;

    constructor(
        private readonly options: MongooseConnectionParams,
        private logger: GraphqlLogger<any>,
    ) {}

    async initConnection() {
        mongoose.set('debug', (coll: string, method: string, query: string, doc: string) => {
            this.logger.debug(
                `MONGOOSE: query executed: ${JSON.stringify({
                    collection: coll,
                    method,
                    query,
                    doc,
                })}`,
            );
        });
        this.wantToDisconnect = false;
        if (!this.isSubscribed) {
            await this.subscribeToEvents(mongoose.connection);
        }
        await this.connect(this.options.connectionString);
    }

    async closeConnection() {
        this.wantToDisconnect = true;
        await mongoose.connection.close(true);
        this.logger.warn('Mongoose connection closed');
    }

    private async connect(connectionString: string) {
        await mongoose.connect(connectionString, {
            autoReconnect: true,
            socketTimeoutMS: 0,
            useNewUrlParser: true,
        });
    }

    private subscribeToEvents(db: mongoose.Connection) {
        db.on('connecting', () => {
            this.logger.info('Connecting to MongoDB...');
        });
        db.on('error', async error => {
            this.logger.error(`Error in MongoDb connection: '${error}'`);
        });
        db.on('connected', () => {
            this.logger.info('MongoDB connected!');
        });
        db.on('open', () => {
            this.logger.info('MongoDB connection opened!');
        });
        db.on('reconnected', () => {
            this.logger.warn('MongoDB reconnected!');
        });
        db.on('disconnected', async () => {
            this.logger.error('MongoDB disconnected!');
            if (!this.wantToDisconnect) {
                setTimeout(async () => {
                    await this.connect(this.options.connectionString);
                }, this.options.waitUntilReconnectInMs || 0);
            }
        });
        this.isSubscribed = true;
    }
}
