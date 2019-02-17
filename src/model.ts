import { Document, model, Model, Query, Schema } from 'mongoose';

export interface RepositoryModel extends Document {
    _id: string;
    creationDate: Date;
    lastUpdateDate: Date;
    deleted: boolean;
    realityId: number;
}

export declare type ModelCreator<T extends RepositoryModel> = (realityId: number) => Model<T>;

export const getModelCreator = <T extends RepositoryModel>(
    collectionPrefix: string,
    schema: Schema,
): ModelCreator<T> => {
    return (realityId: number) =>
        model<T>(`${collectionPrefix}_reality-${realityId}`, configSchema(schema, realityId));
};

const configSchema = <T extends RepositoryModel>(schema: Schema, realityId: number): Schema => {
    schema.add({
        creationDate: Date,
        lastUpdateDate: Date,
        deleted: {
            type: Boolean,
            default: false,
        },
        realityId: Number,
    });
    schema.pre('save', function(this: T, next) {
        const now = new Date();
        if (!this.creationDate) {
            this.creationDate = now;
        }
        this.lastUpdateDate = now;
        this.realityId = realityId;
        next();
    });

    schema.pre('find', function(this: Query<T>) {
        this.where({ deleted: { $ne: true } });
    });
    return schema;
};
