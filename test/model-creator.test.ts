import { PolarisBaseContext, PolarisRequestHeaders } from '@enigmatis/utills';
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

    const testReality = 999;
    const upnHeaderName = 'Kukutsapol';
    let modelCreator: ModelCreator<Person>;
    let model: ModelType<Person>;
    let testHeaders: PolarisRequestHeaders;
    let context: PolarisBaseContext;
    let paths: any;
    beforeAll(() => {
        modelCreator = getModelCreator(testCollectionPrefix, personSchema);
        testHeaders = { realityId: testReality, upn: upnHeaderName };
        context = { headers: testHeaders };
        model = modelCreator(context);
        paths = (model.schema as any).paths;
    });

    describe('creator function', () => {
        describe('schema creator instead of schema', () => {
            let modelCreatorFromSchemaCreator: ModelCreator<any>;
            beforeAll(() => {
                modelCreatorFromSchemaCreator = getModelCreator(
                    testCollectionPrefix,
                    refNameCreator =>
                        new Schema({
                            name: String,
                            date: Date,
                            cars: { type: Schema.Types.ObjectId, ref: refNameCreator('cars') },
                        }),
                );
            });

            test('creating schema with ref to dynamic collection name and passing it to addFields', () => {
                const dynamicRealityId = 123;
                const dynamicModel = modelCreatorFromSchemaCreator({
                    headers: { realityId: dynamicRealityId },
                });
                const dynamicPaths = (dynamicModel.schema as any).paths;
                expect(dynamicPaths).toHaveProperty('cars');
                expect(dynamicPaths.cars.instance).toBe('ObjectID');
                expect(dynamicPaths.cars.options.ref).toBe(
                    MiddlewareFunctions.getCollectionName('cars', { realityId: dynamicRealityId }),
                );
            });
        });

        test('mongoose collection name match standard format', () => {
            expect(model.collection.name).toBe(`${testCollectionPrefix}_reality-${testReality}`);
        });

        test('calling model creator twice return created model, not trowing error', () => {
            const first = modelCreator(context);
            const second = modelCreator(context);
            expect(first).toBe(second);
        });

        test('created model contains given schema', () => {
            const resultPaths = (model.schema as any).paths;
            const firstPaths = (personSchema as any).paths;
            expect(resultPaths.name).toEqual(firstPaths.name);
            expect(resultPaths.age).toEqual(firstPaths.age);
        });

        test('working with clone of the schema, not the schema itself', () => {
            expect(model.schema).not.toBe(personSchema);
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

        test('created model contains field createdBy of type sting', () => {
            expect(paths).toHaveProperty('createdBy');
            expect(paths.createdBy.instance).toBe('String');
        });

        test('throwing validation error when no reality header provided', () => {
            expect(() => modelCreator({ headers: {} as any })).toThrow(
                'child "realityId" fails because ["realityId" is required]',
            );
        });
    });

    describe("middleware's added", () => {
        test("query middleware's added", () => {
            const preMiddlewareMap = (model as any).hooks._pres;
            expect(preMiddlewareMap.get('find').map((x: any) => x.fn.name)).toContain(
                'findHandler',
            );
            expect(preMiddlewareMap.get('findOne').map((x: any) => x.fn.name)).toContain(
                'findHandler',
            );
            expect(preMiddlewareMap.get('findOneAndUpdate').map((x: any) => x.fn.name)).toContain(
                'findHandler',
            );
            expect(preMiddlewareMap.get('update').map((x: any) => x.fn.name)).toContain(
                'findHandler',
            );
            expect(preMiddlewareMap.get('count').map((x: any) => x.fn.name)).toContain(
                'findHandler',
            );
            expect(preMiddlewareMap.get('updateOne').map((x: any) => x.fn.name)).toContain(
                'findHandler',
            );
            expect(preMiddlewareMap.get('updateMany').map((x: any) => x.fn.name)).toContain(
                'findHandler',
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
            const preInsertFunc = MiddlewareFunctions.getPreInsertMany(testHeaders);
            expect(preMiddlewareMap.get('insertMany')[0].fn.name).toBe(preInsertFunc.name);
        });

        test("document middleware's added", () => {
            const preMiddlewareMap = (model as any).hooks._pres;
            const preSaveFunc = MiddlewareFunctions.getPreSave(testHeaders);
            expect(
                preMiddlewareMap.get('save').some((x: any) => x.fn.name === preSaveFunc.name),
            ).toBeTruthy();
        });
    });

    describe("middleware's functions", () => {
        test('findHandlerFunc - add not deleted options to query', () => {
            const where = jest.fn();
            const conditions = { name: 'Dazdraperma' };
            const headers = { realityId: testReality };
            const findHandler = MiddlewareFunctions.getFindHandler(headers);
            findHandler.call({ where, _conditions: conditions });
            expect(where).toHaveBeenCalledTimes(1);
            expect(where).toHaveBeenCalledWith(expect.objectContaining(notDeleted));
        });

        test('findHandlerFunc - not overriding delete option if exist', () => {
            const where = jest.fn();
            const conditions = { deleted: true };
            const headers = { realityId: testReality };
            const findHandler = MiddlewareFunctions.getFindHandler(headers);
            findHandler.call({ where, _conditions: conditions });
            expect(where.mock.calls.some(args => args[0].deleted !== undefined)).toBeFalsy();
        });

        test('findHandlerFunc - add dataVersion options to query from header', () => {
            const where = jest.fn();
            const conditions = { name: 'Dazdraperma' };
            const headers = { realityId: testReality, dataVersion: 123 };
            const findHandler = MiddlewareFunctions.getFindHandler(headers);
            findHandler.call({ where, _conditions: conditions });
            expect(where).toHaveBeenCalledTimes(1);
            expect(where).toHaveBeenCalledWith(
                expect.objectContaining({ dataVersion: { $gt: 123 } }),
            );
        });

        test("findHandlerFunc - don't add dataVersion if not provided in header", () => {
            const where = jest.fn();
            const conditions = { name: 'Dazdraperma' };
            const headers = { realityId: testReality };
            const findHandler = MiddlewareFunctions.getFindHandler(headers);
            findHandler.call({ where, _conditions: conditions });
            expect(where).toHaveBeenCalledTimes(1);
            expect(where.mock.calls.some(x => !x[0].dataVersion)).toBeTruthy();
        });

        test('findHandlerFunc - not overriding delete option if exist', () => {
            const where = jest.fn();
            const conditions = { deleted: true };
            const headers = { realityId: testReality };
            const findHandler = MiddlewareFunctions.getFindHandler(headers);
            findHandler.call({ where, _conditions: conditions });
            expect(where.mock.calls.some(args => args[0].deleted !== undefined)).toBeFalsy();
        });

        test('findHandlerFunc - includeLinkedOperation - add operational reality to requested if includeLinkedOperation are provided to find handler`', () => {
            const where = jest.fn();
            const conditions = { name: 'Dazdraperma' };
            const headers: PolarisRequestHeaders = {
                realityId: testReality,
                includeLinkedOperation: true,
            };
            const findHandler = MiddlewareFunctions.getFindHandler(headers);
            findHandler.call({ where, _conditions: conditions });
            expect(where).toHaveBeenCalledTimes(1);
            expect(where).toHaveBeenCalledWith(
                expect.objectContaining({ realityId: { $or: [testReality, 0] } }),
            );
        });

        test('findHandlerFunc - includeLinkedOperation - not overriding reality id if one provided', () => {
            const where = jest.fn();
            const conditions = { name: 'Dazdraperma', realityId: 43 };
            const headers: PolarisRequestHeaders = {
                realityId: testReality,
                includeLinkedOperation: true,
            };
            const findHandler = MiddlewareFunctions.getFindHandler(headers);
            findHandler.call({ where, _conditions: conditions });
            expect(where).toHaveBeenCalledTimes(1);
            expect(where.mock.calls.some(args => args[0].realityId !== undefined)).toBeFalsy();
        });

        test('findHandlerFunc - add reality id from the header to the query', () => {
            const where = jest.fn();
            const conditions = { name: 'Dazdraperma' };
            const headers: PolarisRequestHeaders = { realityId: testReality };
            const findHandler = MiddlewareFunctions.getFindHandler(headers);
            findHandler.call({ where, _conditions: conditions });
            expect(where).toHaveBeenCalledTimes(1);
            expect(where).toHaveBeenCalledWith(expect.objectContaining({ realityId: testReality }));
        });

        test('findHandlerFunc - reality header not overriding realityId if provided in query', () => {
            const where = jest.fn();
            const conditions = { name: 'Dazdraperma', realityId: 46 };
            const headers: PolarisRequestHeaders = { realityId: testReality };
            const findHandler = MiddlewareFunctions.getFindHandler(headers);
            findHandler.call({ where, _conditions: conditions });
            expect(where).toHaveBeenCalledTimes(1);
            expect(where).toHaveBeenCalledWith(
                expect.not.objectContaining({ realityId: testReality }),
            );
        });

        test('preAggregate - add not deleted options to the end of pipeline so it not overriding', () => {
            const pipeArr = [{ $match: { name: 'Dazdraperma' } }];
            const pipeline = jest.fn(() => pipeArr);
            MiddlewareFunctions.preAggregate.call({ pipeline } as any);
            expect(pipeline).toHaveBeenCalledTimes(1);
            expect(pipeArr[pipeArr.length - 1]).toEqual({ $match: notDeleted });
        });

        test('softRemoveFunc - calling updateOne with right params when single', () => {
            const scope: any = {
                updateOne: jest.fn(),
                updateMany: jest.fn(),
            };
            const query = {
                name: 'Dazdraperma',
            };
            const options = { single: true };
            MiddlewareFunctions.softRemoveFunc.call(scope, query, options);
            expect(scope.updateOne).toHaveBeenCalledTimes(1);
            expect(scope.updateOne).toHaveBeenLastCalledWith(query, deleted, options, undefined);
        });

        test('softRemoveFunc - calling updateMany with right params when not single', () => {
            const scope: any = {
                updateOne: jest.fn(),
                updateMany: jest.fn(),
            };
            const query = {
                name: 'Dazdraperma',
            };
            const options = { skip: 1 };
            MiddlewareFunctions.softRemoveFunc.call(scope, query, options);
            expect(scope.updateMany).toHaveBeenCalledTimes(1);
            expect(scope.updateMany).toHaveBeenLastCalledWith(query, deleted, options, undefined);
        });

        test('softRemoveFunc - passing callback when callback is second argument', () => {
            const scope: any = {
                updateOne: jest.fn(),
                updateMany: jest.fn(),
            };
            const query = {
                name: 'Dazdraperma',
            };
            const callback = jest.fn();
            MiddlewareFunctions.softRemoveFunc.call(scope, query, callback);
            expect(scope.updateMany).toHaveBeenCalledTimes(1);
            expect(scope.updateMany).toHaveBeenLastCalledWith(query, deleted, {}, callback);
        });

        test('softRemoveFunc - passing callback when callback is last argument', () => {
            const scope: any = {
                updateOne: jest.fn(),
                updateMany: jest.fn(),
            };
            const query = {
                name: 'Dazdraperma',
            };
            const options = { skip: 1 };
            const callback = jest.fn();
            MiddlewareFunctions.softRemoveFunc.call(scope, query, options, callback);
            expect(scope.updateMany).toHaveBeenCalledTimes(1);
            expect(scope.updateMany).toHaveBeenLastCalledWith(query, deleted, options, callback);
        });

        test('singleSoftRemove - calling soft remove with right params and bind this', () => {
            const softRemoveSpy = jest.spyOn(MiddlewareFunctions, 'softRemoveFunc');
            const scope: any = {
                updateOne: jest.fn(),
                updateMany: jest.fn(),
            };
            const query = {
                name: 'Dazdraperma',
            };
            const callback = jest.fn();
            MiddlewareFunctions.singleSoftRemove.call(scope, query, callback);
            expect(softRemoveSpy).toHaveBeenCalledTimes(1);
            expect(softRemoveSpy).toHaveBeenLastCalledWith(query, { single: true }, callback);
            // checking updateOne called to know that this binded corretly
            expect(scope.updateOne).toHaveBeenCalled();
        });

        test('findOneAndSoftDelete - calling findOneAndUpdate with right params when first arg is not a callback', () => {
            const softRemoveSpy = jest.spyOn(MiddlewareFunctions, 'softRemoveFunc');
            const scope: any = {
                findOneAndUpdate: jest.fn(),
            };
            const query = {
                name: 'Dazdraperma',
            };
            const options = { projection: { name: 1 } };
            const callback = jest.fn();
            MiddlewareFunctions.findOneAndSoftDelete.call(scope, query, options, callback);
            expect(scope.findOneAndUpdate).toHaveBeenCalledTimes(1);
            expect(scope.findOneAndUpdate).toHaveBeenLastCalledWith(
                query,
                deleted,
                options,
                callback,
            );
        });

        test('findOneAndSoftDelete - calling findOneAndUpdate with right params when first arg is a callback', () => {
            const scope: any = {
                findOneAndUpdate: jest.fn(),
            };
            const callback = jest.fn();
            MiddlewareFunctions.findOneAndSoftDelete.call(scope, callback);
            expect(scope.findOneAndUpdate).toHaveBeenCalledTimes(1);
            expect(scope.findOneAndUpdate).toHaveBeenLastCalledWith(deleted, callback);
        });

        test('addDynamicPropertiesToDocument - adding last updateDate, realityId and lastUpdatedBy to the document', () => {
            const document = { name: 'Dazdraperma' } as any;
            const mockedDate = new Date(1551952597682);
            const originDate = Date;
            const mockedNewDate: any = jest.fn(() => mockedDate);
            mockedNewDate.UTC = originDate.UTC;
            mockedNewDate.parse = originDate.parse;
            mockedNewDate.now = originDate.now;
            global.Date = mockedNewDate;
            MiddlewareFunctions.addDynamicPropertiesToDocument(document, testHeaders);
            expect(document).toHaveProperty('lastUpdateDate');
            expect(document.lastUpdateDate).toBe(mockedDate);
            expect(mockedNewDate).toHaveBeenCalledTimes(1);
            expect(document).toHaveProperty('realityId');
            expect(document.realityId).toBe(testReality);
            expect(document).toHaveProperty('lastUpdatedBy');
            expect(document.lastUpdatedBy).toBe(upnHeaderName);
        });

        test('addDynamicPropertiesToDocument - adding createdBy string property if not exist, setting to upn header', () => {
            const document = { name: 'Dazdraperma' } as any;
            MiddlewareFunctions.addDynamicPropertiesToDocument(document, testHeaders);
            expect(document.createdBy).toBe(upnHeaderName);
        });

        test('addDynamicPropertiesToDocument - upn header not overriding createdBy field if already existing', () => {
            const createdBy = 'not Kukutsapol';
            const document = { name: 'Dazdraperma', createdBy } as any;
            MiddlewareFunctions.addDynamicPropertiesToDocument(document, testHeaders);
            expect(document.createdBy).toBe(createdBy);
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
            MiddlewareFunctions.addDynamicPropertiesToDocument(document, testHeaders);
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
            const preSaveFunc = MiddlewareFunctions.getPreSave(testHeaders);
            const next = jest.fn(() => callOrder.push('next'));
            preSaveFunc.call(document, next);
            expect(addDynamicPropertiesToDocumentSpy).toHaveBeenCalledTimes(1);
            expect(addDynamicPropertiesToDocumentSpy).toHaveBeenLastCalledWith(
                document,
                testHeaders,
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
            const preSaveFunc = MiddlewareFunctions.getPreInsertMany(testHeaders);
            const next = jest.fn(() => callOrder.push('next'));
            preSaveFunc.call(undefined as any, next, documents);
            expect(addDynamicPropertiesToDocumentSpy).toHaveBeenCalledTimes(2);
            expect(addDynamicPropertiesToDocumentSpy).toHaveBeenNthCalledWith(
                1,
                documents[0],
                testHeaders,
            );
            expect(addDynamicPropertiesToDocumentSpy).toHaveBeenNthCalledWith(
                2,
                documents[1],
                testHeaders,
            );
            expect(next).toHaveBeenCalledTimes(1);
            expect(callOrder[callOrder.length - 1]).toEqual('next');
        });
    });
});
