import { Model, model, Schema } from 'mongoose';

import { getCollectionName } from './schema-helpers/middleware-functions';
import {
    addDocumentMiddleware,
    addModelMiddleware,
    addQueryMiddleware,
} from './schema-helpers/middleware-setters';
import { addFields } from './schema-helpers/repository-fields';
import { InnerModelType, ModelCreator } from './types';

export interface RepositoryModel {
    _id: string;
    creationDate: Date;
    lastUpdateDate: Date;
    deleted: boolean;
    realityId: number;
}

export const getModelCreator = <T>(collectionPrefix: string, schema: Schema): ModelCreator<T> => {
    addFields(schema);
    addQueryMiddleware(schema);
    return (realityId: number) => {
        addDocumentMiddleware(schema, realityId);
        addModelMiddleware(schema, realityId);
        return model<InnerModelType<T>>(getCollectionName(collectionPrefix, realityId), schema);
    };
};
