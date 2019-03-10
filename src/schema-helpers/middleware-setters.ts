import { Aggregate, HookNextFunction, Model, Schema } from 'mongoose';
import {
    findHandlerFunc,
    findOneAndSoftDelete,
    getPreInsertMany,
    getPreSave,
    preAggregate,
    singleSoftRemove,
    softRemoveFunc,
} from './middleware-functions';

export const addQueryMiddleware = (schema: Schema) => {
    ['find', 'findOne', 'findOneAndUpdate', 'update', 'count', 'updateOne', 'updateMany'].forEach(
        middleware => {
            schema.pre(middleware, findHandlerFunc as any);
        },
    );
    schema.pre('aggregate', preAggregate);
    schema.statics = {
        ...schema.statics,
        remove: softRemoveFunc,
        deleteOne: singleSoftRemove,
        deleteMany: softRemoveFunc,
        findOneAndDelete: findOneAndSoftDelete,
        findOneAndRemove: findOneAndSoftDelete,
    };
};

export const addModelMiddleware = (schema: Schema, realityId: number) => {
    schema.pre('insertMany', getPreInsertMany(realityId));
};

export const addDocumentMiddleware = (schema: Schema, realityId: number): Schema => {
    schema.pre('save', getPreSave(realityId));
    return schema;
};
