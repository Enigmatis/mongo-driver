import { PolarisRequestHeaders } from '@enigmatis/utills';
import { Schema } from 'mongoose';
import { ModelConfiguration } from '../model-config';
import {
    findOneAndSoftDelete,
    getFindHandler,
    getPreInsertMany,
    getPreSave,
    preAggregate,
    singleSoftRemove,
    softRemoveFunc,
} from './middleware-functions';

export const addQueryMiddleware = (
    schema: Schema,
    headers: PolarisRequestHeaders,
    modelConfiguration?: ModelConfiguration,
) => {
    const findHandlerFunc = getFindHandler(headers, modelConfiguration);
    ['find', 'findOne', 'findOneAndUpdate', 'update', 'count', 'updateOne', 'updateMany'].forEach(
        middleware => {
            schema.pre(middleware, findHandlerFunc as any);
        },
    );
    schema.pre('aggregate', preAggregate);
    if (
        !modelConfiguration ||
        (modelConfiguration && modelConfiguration.allowSoftDelete !== false)
    ) {
        schema.statics = {
            ...schema.statics,
            remove: softRemoveFunc,
            deleteOne: singleSoftRemove,
            deleteMany: softRemoveFunc,
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
