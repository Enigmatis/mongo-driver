import { Aggregate, HookNextFunction, Model } from 'mongoose';
import { RepositoryModel } from '../model-creator';
import { InnerModelType } from '../types';
import { deleted, notDeleted } from './constants';
import * as thisModule from './middleware-functions';

export const addDynamicPropertiesToDocument = <T extends RepositoryModel>(
    document: T,
    realityId: number,
) => {
    document.lastUpdateDate = new Date();
    document.realityId = realityId;
};

export const getPreSave = (realityId: number) => {
    return function preSaveFunc(this: InnerModelType<any>, next: () => void) {
        // using thisModule to be abale to mock softRemoveFunc in tests
        thisModule.addDynamicPropertiesToDocument(this, realityId);
        next();
    };
};

export const getPreInsertMany = (realityId: number) => {
    return function preInsertMany(this: Model<any>, next: HookNextFunction, docs: any[]) {
        docs.forEach(doc => {
            // using thisModule to be abale to mock softRemoveFunc in tests
            thisModule.addDynamicPropertiesToDocument(doc, realityId);
        });
        return next();
    };
};

export function findHandlerFunc<T>(this: any) {
    if (!this._conditions.deleted) {
        this.where({ ...notDeleted });
    }
}

export function softRemoveFunc<T>(
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

export function singleSoftRemove(
    this: Model<any>,
    query: any,
    callback?: (err: any, raw: any) => void,
) {
    // using thisModule to be abale to mock softRemoveFunc in tests
    return thisModule.softRemoveFunc.call(this, query, { single: true }, callback);
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

export const getCollectionName = (collectionPrefix: string, realityId: number) =>
    `${collectionPrefix}_reality-${realityId}`;
