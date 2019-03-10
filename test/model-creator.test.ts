import { Document, Schema } from 'mongoose';
import { getModelCreator } from '../src/model-creator';
import { deleted, notDeleted } from '../src/schema-helpers/constants';
import * as MiddlewareFunctions from '../src/schema-helpers/middleware-functions';
import { ModelCreator, ModelType } from '../src/types';

const testCollectionPrefix = 'testing';

describe('module creator', () => {
    interface Person {
        name: string;
        age: number;
    }

    const personSchema = new Schema({
        name: String,
        age: Number,
    });

    let modelCreator: ModelCreator<Person>;
    let model: ModelType<Person>;
    let paths: any;
    beforeAll(async () => {
        modelCreator = getModelCreator(testCollectionPrefix, personSchema);
        model = modelCreator(testReality);
        paths = (model.schema as any).paths;
    });
    const testReality = 999;

    describe('creator function', () => {
        test('mongoose collection name match standard format', () => {
            expect(model.collection.name).toBe(`${testCollectionPrefix}_reality-${testReality}`);
        });

        test('created model contains given schema', () => {
            expect(model.schema).toBe(personSchema);
        });

        test('created model contains field createdBy of type string', () => {
            expect(paths).toHaveProperty('createdBy');
            expect(paths.createdBy.instance).toBe('String');
        });

        test('created model contains field lastUpdatedBy of type string', () => {
            expect(paths).toHaveProperty('lastUpdatedBy');
            expect(paths.lastUpdatedBy.instance).toBe('String');
        });

        test('created model contains field realityId of type number', () => {
            expect(paths).toHaveProperty('realityId');
            expect(paths.realityId.instance).toBe('Number');
        });

        test('created model contains field creationDate of type Date that defaults to Date.now function', () => {
            expect(paths).toHaveProperty('creationDate');
            expect(paths.creationDate.instance).toBe('Date');
            expect(paths.creationDate.defaultValue).toBe(Date.now);
        });

        test('created model contains field deleted of type Boolean that defaults to false', () => {
            expect(paths).toHaveProperty('deleted');
            expect(paths.deleted.instance).toBe('Boolean');
            expect(paths.deleted.defaultValue).toBe(false);
        });
    });

    describe("middleware's added", () => {
        test("query middleware's added", () => {
            const preMiddlewareMap = (model as any).hooks._pres;
            expect(preMiddlewareMap.get('find').map((x: any) => x.fn)).toContain(
                MiddlewareFunctions.findHandlerFunc,
            );
            expect(preMiddlewareMap.get('findOne').map((x: any) => x.fn)).toContain(
                MiddlewareFunctions.findHandlerFunc,
            );
            expect(preMiddlewareMap.get('findOneAndUpdate').map((x: any) => x.fn)).toContain(
                MiddlewareFunctions.findHandlerFunc,
            );
            expect(preMiddlewareMap.get('update').map((x: any) => x.fn)).toContain(
                MiddlewareFunctions.findHandlerFunc,
            );
            expect(preMiddlewareMap.get('count').map((x: any) => x.fn)).toContain(
                MiddlewareFunctions.findHandlerFunc,
            );
            expect(preMiddlewareMap.get('updateOne').map((x: any) => x.fn)).toContain(
                MiddlewareFunctions.findHandlerFunc,
            );
            expect(preMiddlewareMap.get('updateMany').map((x: any) => x.fn)).toContain(
                MiddlewareFunctions.findHandlerFunc,
            );
            expect(preMiddlewareMap.get('aggregate').map((x: any) => x.fn)).toContain(
                MiddlewareFunctions.preAggregate,
            );
            expect(model.remove).toBe(MiddlewareFunctions.softRemoveFunc);
            expect(model.deleteOne).toBe(MiddlewareFunctions.singleSoftRemove);
            expect(model.deleteMany).toBe(MiddlewareFunctions.softRemoveFunc);
            expect(model.findOneAndDelete).toBe(MiddlewareFunctions.findOneAndSoftDelete);
            expect(model.findOneAndRemove).toBe(MiddlewareFunctions.findOneAndSoftDelete);
        });

        test("model middleware's added", () => {
            const preMiddlewareMap = (model as any).hooks._pres;
            const preInsertFunc = MiddlewareFunctions.getPreInsertMany(testReality);
            expect(preMiddlewareMap.get('insertMany')[0].fn.name).toBe(preInsertFunc.name);
        });

        test("document middleware's added", () => {
            const preMiddlewareMap = (model as any).hooks._pres;
            const preSaveFunc = MiddlewareFunctions.getPreSave(testReality);
            expect(
                preMiddlewareMap.get('save').some((x: any) => x.fn.name === preSaveFunc.name),
            ).toBeTruthy();
        });
    });

    describe("middleware's functions", () => {
        test('findHandlerFunc - add not deleted options to query', () => {
            const where = jest.fn();
            const conditions = { name: 'Dazdraperma' };
            MiddlewareFunctions.findHandlerFunc.call({ where, _conditions: conditions });
            expect(where).toHaveBeenCalledTimes(1);
            expect(where).toHaveBeenCalledWith(expect.objectContaining(notDeleted));
        });

        test('findHandlerFunc - not overriding delete option if exist', () => {
            const where = jest.fn();
            const conditions = { deleted: true };
            MiddlewareFunctions.findHandlerFunc.call({ where, _conditions: conditions });
            expect(where).not.toHaveBeenCalled();
        });

        test('preAggregate - add not deleted options to the end of pipeline so it not overriding', () => {
            const pipeArr = [{ $match: { name: 'Dazdraperma' } }];
            const pipeline = jest.fn(() => pipeArr);
            MiddlewareFunctions.preAggregate.call({ pipeline } as any);
            expect(pipeline).toHaveBeenCalledTimes(1);
            expect(pipeArr[pipeArr.length - 1]).toEqual({ $match: notDeleted });
        });

        test('softRemoveFunc - calling updateOne with right params when single', () => {
            const context: any = {
                updateOne: jest.fn(),
                updateMany: jest.fn(),
            };
            const query = {
                name: 'Dazdraperma',
            };
            const options = { single: true };
            MiddlewareFunctions.softRemoveFunc.call(context, query, options);
            expect(context.updateOne).toHaveBeenCalledTimes(1);
            expect(context.updateOne).toHaveBeenLastCalledWith(query, deleted, options, undefined);
        });

        test('softRemoveFunc - calling updateMany with right params when not single', () => {
            const context: any = {
                updateOne: jest.fn(),
                updateMany: jest.fn(),
            };
            const query = {
                name: 'Dazdraperma',
            };
            const options = { skip: 1 };
            MiddlewareFunctions.softRemoveFunc.call(context, query, options);
            expect(context.updateMany).toHaveBeenCalledTimes(1);
            expect(context.updateMany).toHaveBeenLastCalledWith(query, deleted, options, undefined);
        });

        test('softRemoveFunc - passing callback when callback is second argument', () => {
            const context: any = {
                updateOne: jest.fn(),
                updateMany: jest.fn(),
            };
            const query = {
                name: 'Dazdraperma',
            };
            const callback = jest.fn();
            MiddlewareFunctions.softRemoveFunc.call(context, query, callback);
            expect(context.updateMany).toHaveBeenCalledTimes(1);
            expect(context.updateMany).toHaveBeenLastCalledWith(query, deleted, {}, callback);
        });

        test('softRemoveFunc - passing callback when callback is last argument', () => {
            const context: any = {
                updateOne: jest.fn(),
                updateMany: jest.fn(),
            };
            const query = {
                name: 'Dazdraperma',
            };
            const options = { skip: 1 };
            const callback = jest.fn();
            MiddlewareFunctions.softRemoveFunc.call(context, query, options, callback);
            expect(context.updateMany).toHaveBeenCalledTimes(1);
            expect(context.updateMany).toHaveBeenLastCalledWith(query, deleted, options, callback);
        });

        test('singleSoftRemove - calling soft remove with right params and bind this', () => {
            const softRemoveSpy = jest.spyOn(MiddlewareFunctions, 'softRemoveFunc');
            const context: any = {
                updateOne: jest.fn(),
                updateMany: jest.fn(),
            };
            const query = {
                name: 'Dazdraperma',
            };
            const callback = jest.fn();
            MiddlewareFunctions.singleSoftRemove.call(context, query, callback);
            expect(softRemoveSpy).toHaveBeenCalledTimes(1);
            expect(softRemoveSpy).toHaveBeenLastCalledWith(query, { single: true }, callback);
            // checking updateOne called to know that this binded corretly
            expect(context.updateOne).toHaveBeenCalled();
        });

        test('findOneAndSoftDelete - calling findOneAndUpdate with right params when first arg is not a callback', () => {
            const softRemoveSpy = jest.spyOn(MiddlewareFunctions, 'softRemoveFunc');
            const context: any = {
                findOneAndUpdate: jest.fn(),
            };
            const query = {
                name: 'Dazdraperma',
            };
            const options = { projection: { name: 1 } };
            const callback = jest.fn();
            MiddlewareFunctions.findOneAndSoftDelete.call(context, query, options, callback);
            expect(context.findOneAndUpdate).toHaveBeenCalledTimes(1);
            expect(context.findOneAndUpdate).toHaveBeenLastCalledWith(
                query,
                deleted,
                options,
                callback,
            );
        });

        test('findOneAndSoftDelete - calling findOneAndUpdate with right params when first arg is a callback', () => {
            const context: any = {
                findOneAndUpdate: jest.fn(),
            };
            const callback = jest.fn();
            MiddlewareFunctions.findOneAndSoftDelete.call(context, callback);
            expect(context.findOneAndUpdate).toHaveBeenCalledTimes(1);
            expect(context.findOneAndUpdate).toHaveBeenLastCalledWith(deleted, callback);
        });

        test('addDynamicPropertiesToDocument - adding last updateDate and realityId to the document', () => {
            const document = { name: 'Dazdraperma' } as any;
            const mockedDate = new Date(1551952597682);
            const originDate = Date;
            const mockedNewDate: any = jest.fn(() => mockedDate);
            mockedNewDate.UTC = originDate.UTC;
            mockedNewDate.parse = originDate.parse;
            mockedNewDate.now = originDate.now;
            global.Date = mockedNewDate;
            MiddlewareFunctions.addDynamicPropertiesToDocument(document, testReality);
            expect(document).toHaveProperty('lastUpdateDate');
            expect(document.lastUpdateDate).toBe(mockedDate);
            expect(mockedNewDate).toHaveBeenCalledTimes(1);
            expect(document).toHaveProperty('realityId');
            expect(document.realityId).toBe(testReality);
        });

        test('getPreSave - returning function is calling addDynamicPropertiesToDocument with right params and calling next', () => {
            const callOrder: string[] = [];
            const addDynamicPropertiesToDocumentSpy = jest
                .spyOn(MiddlewareFunctions, 'addDynamicPropertiesToDocument')
                .mockImplementation(() => callOrder.push('addDynamicPropertiesToDocument'));
            const document = { name: 'Dazdraperma' } as any;
            const preSaveFunc = MiddlewareFunctions.getPreSave(testReality);
            const next = jest.fn(() => callOrder.push('next'));
            preSaveFunc.call(document, next);
            expect(addDynamicPropertiesToDocumentSpy).toHaveBeenCalledTimes(1);
            expect(addDynamicPropertiesToDocumentSpy).toHaveBeenLastCalledWith(
                document,
                testReality,
            );
            expect(next).toHaveBeenCalledTimes(1);
            expect(callOrder).toEqual(['addDynamicPropertiesToDocument', 'next']);
        });

        test('getPreInsertMany - returning function is calling addDynamicPropertiesToDocument with right params for each document and calling next', () => {
            const callOrder: string[] = [];
            const addDynamicPropertiesToDocumentSpy = jest
                .spyOn(MiddlewareFunctions, 'addDynamicPropertiesToDocument')
                .mockImplementation(() => callOrder.push('addDynamicPropertiesToDocument'));
            const documents = [{ name: 'Dazdraperma' }, { name: 'Kukutsapol' }];
            const preSaveFunc = MiddlewareFunctions.getPreInsertMany(testReality);
            const next = jest.fn(() => callOrder.push('next'));
            preSaveFunc.call(undefined as any, next, documents);
            expect(addDynamicPropertiesToDocumentSpy).toHaveBeenCalledTimes(2);
            expect(addDynamicPropertiesToDocumentSpy).toHaveBeenNthCalledWith(
                1,
                documents[0],
                testReality,
            );
            expect(addDynamicPropertiesToDocumentSpy).toHaveBeenNthCalledWith(
                2,
                documents[1],
                testReality,
            );
            expect(next).toHaveBeenCalledTimes(1);
            expect(callOrder[callOrder.length - 1]).toEqual('next');
        });
    });
});
