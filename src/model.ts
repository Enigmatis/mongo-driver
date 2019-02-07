import { Document, model, Model, Query, Schema } from 'mongoose';

export interface BasicModel extends Document {
    _id: string;
    createdAt: Date;
    updatedAt: Date;
    deleted: boolean;
}

export declare type ModuleCreator<T extends BasicModel> = (realityId: number) => Model<T>;

export const getModelCreator = <T extends BasicModel>(
    collectionPrefix: string,
    schema: Schema,
): ModuleCreator<T> => {
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

    return (realityId: number) => model<T>(`book_reality-${realityId}`, schema);
};
