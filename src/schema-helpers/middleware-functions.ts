import { PolarisRequestHeaders, SoftDeleteConfiguration } from '@enigmatis/utills';
import { Aggregate, HookNextFunction, Model } from 'mongoose';
import { RepositoryModel } from '../model-creator';
import { InnerModelType } from '../types';
import { deleted, notDeleted } from './constants';
import * as thisModule from './middleware-functions';

export const addDynamicPropertiesToDocument = <T extends RepositoryModel>(
    document: T,
    { realityId, upn }: PolarisRequestHeaders,
) => {
    document.lastUpdateDate = new Date();
    document.realityId = realityId!;
    document.createdBy = document.createdBy || upn;
    document.lastUpdatedBy = upn;
};

export const getPreSave = (headers: PolarisRequestHeaders) => {
    return function preSaveFunc(this: InnerModelType<any>, next: () => void) {
        // using thisModule to be abale to mock softRemove in tests
        thisModule.addDynamicPropertiesToDocument(this, headers);
        next();
    };
};

export const getPreInsertMany = (headers: PolarisRequestHeaders) => {
    return function preInsertMany(this: Model<any>, next: HookNextFunction, docs: any[]) {
        docs.forEach(doc => {
            // using thisModule to be abale to mock softRemove in tests
            thisModule.addDynamicPropertiesToDocument(doc, headers);
        });
        return next();
    };
};

export const getFindHandler = (
    headers: PolarisRequestHeaders,
    softDeleteConfiguration?: SoftDeleteConfiguration,
) => {
    return function findHandler(this: any) {
        const conditions = this._conditions;
        const realityId =
            headers.realityId !== undefined &&
            conditions.realityId === undefined &&
            (headers.includeLinkedOperation
                ? { realityId: { $or: [headers.realityId, 0] } }
                : { realityId: headers.realityId });
        const deletedCondition =
            !conditions.deleted &&
            (!(softDeleteConfiguration && softDeleteConfiguration.softDeleteReturnEntities) &&
                notDeleted);
        this.where({
            ...realityId,
            ...deletedCondition,
            ...(headers.dataVersion &&
                !conditions.dataVersion && { dataVersion: { $gt: headers.dataVersion } }),
        });
    };
};

export function softRemove<T>(
    this: Model<any>,
    query: any,
    optionsOrCallback: any,
    callback?: (err: any, raw: any) => void,
) {
    const single = optionsOrCallback && (optionsOrCallback as any).single;
    let callbackFunc = callback;
    let options = {};
    if (typeof optionsOrCallback === 'function') {
        callbackFunc = optionsOrCallback;
    } else {
        options = optionsOrCallback;
    }
    if (single) {
        return this.updateOne(query, deleted, options, callbackFunc as any);
    } else {
        return this.updateMany(query, deleted, options, callbackFunc as any);
    }
}

export function softRemoveOne(
    this: Model<any>,
    query: any,
    callback?: (err: any, raw: any) => void,
) {
    // using thisModule to be abale to mock softRemove in tests
    return thisModule.softRemove.call(this, query, { single: true }, callback);
}

export function findOneAndSoftDelete(
    this: Model<any>,
    first: any,
    second?: any,
    callback?: (err: any, raw: any) => void,
) {
    if (typeof first !== 'function') {
        return this.findOneAndUpdate(first, deleted, second, callback);
    } else {
        return this.findOneAndUpdate(deleted, first);
    }
}

export function preAggregate(this: Aggregate<any>) {
    this.pipeline().push({ $match: notDeleted });
}

export const getCollectionName = (collectionPrefix: string, { realityId }: PolarisRequestHeaders) =>
    `${collectionPrefix}_reality-${realityId}`;
