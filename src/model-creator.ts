import { PolarisBaseContext, PolarisRequestHeaders } from '@enigmatis/utills';
import * as Joi from 'joi';
import { Model, model, Schema } from 'mongoose';
import { getCollectionName } from './schema-helpers/middleware-functions';
import {
    addDocumentMiddleware,
    addModelMiddleware,
    addQueryMiddleware,
} from './schema-helpers/middleware-setters';
import { addFields } from './schema-helpers/repository-fields';
import { InnerModelType, ModelCreator } from './types';

const headersSchema = Joi.object().keys({
    realityId: Joi.number().required(),
});

export interface RepositoryModel {
    _id: string;
    creationDate: Date;
    lastUpdateDate: Date;
    deleted: boolean;
    realityId: number;
    createdBy?: string;
    lastUpdatedBy?: string;
}

declare type schemaCreator = (refNameCreator: (name: string) => string) => Schema;

const getRefNameCreator = (headers: PolarisRequestHeaders) => (name: string) =>
    getCollectionName(name, headers);

export const getModelCreator = <T>(
    collectionPrefix: string,
    schemaOrCreator: Schema | schemaCreator,
): ModelCreator<T> => {
    return ({ headers }: PolarisBaseContext) => {
        const schema =
            schemaOrCreator instanceof Function
                ? schemaOrCreator(getRefNameCreator(headers))
                : schemaOrCreator;
        addFields(schema);
        headers = checkHeaders(headers);
        addQueryMiddleware(schema, headers);
        addDocumentMiddleware(schema, headers);
        addModelMiddleware(schema, headers);
        return model<InnerModelType<T>>(getCollectionName(collectionPrefix, headers), schema);
    };
};

const checkHeaders = (headers: PolarisRequestHeaders) => {
    const { error, value } = Joi.validate(headers, headersSchema, {
        abortEarly: false,
        allowUnknown: true,
    });
    if (error) {
        throw error;
    } else {
        return value;
    }
};
