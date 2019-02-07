import { Document, model, Model, Query, Schema } from 'mongoose';

export interface RepositoryModel extends Document {
    _id: string;
    createdAt: Date;
    updatedAt: Date;
    deleted: boolean;
}

export declare type ModelCreator<T extends RepositoryModel> = (realityId: number) => Model<T>;

export const getModelCreator = <T extends RepositoryModel>(
    collectionPrefix: string,
    schema: Schema,
): ModelCreator<T> => {
    schema.add({
        createdAt: Date,
        updatedAt: Date,
        deleted: {
            type: Boolean,
            default: false,
        },
    });
    schema.pre('save', function(this: T, next) {
        const now = new Date();
        if (!this.createdAt) {
            this.createdAt = now;
        }
        this.updatedAt = now;
        next();
    });

    schema.pre('find', function(this: Query<T>) {
        this.where({ deleted: { $ne: true } });
    });

    return (realityId: number) => model<T>(`${collectionPrefix}_reality-${realityId}`, schema);
};
