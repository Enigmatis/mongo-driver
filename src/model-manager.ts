import {
    PolarisBaseContext,
    PolarisRequestHeaders,
    SoftDeleteConfiguration,
} from '@enigmatis/utills';
import * as Joi from 'joi';
import { Model, model, models, Schema } from 'mongoose';
import { addDataVersionMiddleware } from './data-version/data-version-middleware';
import { getCollectionName } from './schema-helpers/middleware-functions';
import {
    addDocumentMiddleware,
    addModelMiddleware,
    addQueryMiddleware,
} from './schema-helpers/middleware-setters';
import { ModelExecutor } from './schema-helpers/model-executor';
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
    dataVersion: number;
}

export declare type SchemaCreator = (refNameCreator: (name: string) => string) => Schema;

export const getModelExecutor = <T>(
    collectionPrefix: string,
    schemaOrCreator: Schema | SchemaCreator,
): ModelExecutor<T> => {
    return new ModelExecutor<T>(getModelCreator<T>(collectionPrefix, schemaOrCreator));
};

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
    addDataVersionMiddleware(schema);
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
