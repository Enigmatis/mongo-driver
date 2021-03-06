import { PolarisRequestHeaders, SoftDeleteConfiguration } from '@enigmatis/utills';
import { Schema } from 'mongoose';
import {
    findOneAndSoftDelete,
    getFindHandler,
    getPreInsertMany,
    getPreSave,
    preAggregate,
    softRemove,
    softRemoveOne,
} from './middleware-functions';

export const addQueryMiddleware = (
    schema: Schema,
    headers: PolarisRequestHeaders,
    softDeleteConfiguration?: SoftDeleteConfiguration,
) => {
    const findHandlerFunc = getFindHandler(headers, softDeleteConfiguration);
    ['find', 'findOne', 'findOneAndUpdate', 'update', 'count', 'updateOne', 'updateMany'].forEach(
        middleware => {
            schema.pre(middleware, findHandlerFunc as any);
        },
    );
    schema.pre('aggregate', preAggregate);
    if (
        !softDeleteConfiguration ||
        (softDeleteConfiguration && softDeleteConfiguration.allowSoftDelete !== false)
    ) {
        schema.statics = {
            ...schema.statics,
            remove: softRemove,
            deleteOne: softRemoveOne,
            deleteMany: softRemove,
            findOneAndDelete: findOneAndSoftDelete,
            findOneAndRemove: findOneAndSoftDelete,
        };
    }
};

export const addModelMiddleware = (schema: Schema, headers: PolarisRequestHeaders) => {
    schema.pre('insertMany', getPreInsertMany(headers));
};

export const addDocumentMiddleware = (schema: Schema, headers: PolarisRequestHeaders) => {
    schema.pre('save', getPreSave(headers));
};
