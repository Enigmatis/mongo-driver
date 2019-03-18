import { PolarisRequestHeaders } from '@enigmatis/utills';
import { Aggregate, HookNextFunction, Model, Schema } from 'mongoose';
import {
    findOneAndSoftDelete,
    getFindHandler,
    getPreInsertMany,
    getPreSave,
    preAggregate,
    singleSoftRemove,
    softRemoveFunc,
} from './middleware-functions';

export const addQueryMiddleware = (schema: Schema, headers: PolarisRequestHeaders) => {
    const findHandlerFunc = getFindHandler(headers);
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

export const addModelMiddleware = (schema: Schema, headers: PolarisRequestHeaders) => {
    schema.pre('insertMany', getPreInsertMany(headers));
};

export const addDocumentMiddleware = (schema: Schema, headers: PolarisRequestHeaders) => {
    schema.pre('save', getPreSave(headers));
};
