import {
    PolarisBaseContext,
    PolarisRequestHeaders,
    SoftDeleteConfiguration,
} from '@enigmatis/utills';
import * as Joi from 'joi';
import { Model, model, models, Schema } from 'mongoose';
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

export declare type SchemaCreator = (refNameCreator: (name: string) => string) => Schema;

export const getModelCreator = <T>(
    collectionPrefix: string,
    schemaOrCreator: Schema | SchemaCreator,
): ModelCreator<T> => {
    return ({ headers, softDeleteConfiguration }: PolarisBaseContext): Model<InnerModelType<T>> => {
        const collectionName = getCollectionName(collectionPrefix, headers);
        return (
            models[collectionName] ||
            model<InnerModelType<T>>(
                collectionName,
                createSchemaForModel(
                    collectionPrefix,
                    schemaOrCreator,
                    headers,
                    softDeleteConfiguration,
                ),
            )
        );
    };
};

const getRefNameCreator = (headers: PolarisRequestHeaders) => (name: string) =>
    getCollectionName(name, headers);

const createSchemaForModel = <T>(
    collectionPrefix: string,
    schemaOrCreator: Schema | SchemaCreator,
    headers: PolarisRequestHeaders,
    softDeleteConfiguration?: SoftDeleteConfiguration,
) => {
    const schema =
        schemaOrCreator instanceof Function
            ? schemaOrCreator(getRefNameCreator(headers))
            : schemaOrCreator.clone();
    headers = checkHeaders(headers);
    addFields(schema);
    addQueryMiddleware(schema, headers, softDeleteConfiguration);
    addDocumentMiddleware(schema, headers);
    addModelMiddleware(schema, headers);
    return schema;
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
