import { ExecutionMetadata, PolarisBaseContext, PolarisRequestHeaders } from '@enigmatis/utills';
import { Schema } from 'mongoose';
import { getModelExecutor } from '../src/model-manager';
import { ModelExecutor } from '../src/schema-helpers/model-executor';
import { ModelType } from '../src/types';

const testCollectionPrefix = 'testing';

describe('module executor', () => {
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
    let modelExecutor: ModelExecutor<Person>;
    let model: ModelType<Person>;
    const testMetadata: ExecutionMetadata = {};
    let testHeaders: PolarisRequestHeaders;
    let context: PolarisBaseContext;
    beforeAll(() => {
        modelExecutor = getModelExecutor(testCollectionPrefix, personSchema);
        testHeaders = { realityId: testReality, upn: upnHeaderName };
        context = { headers: testHeaders, executionMetadata: testMetadata };
        model = modelExecutor.model(context);
    });

    describe('executor constructor', () => {
        describe('schema creator instead of schema', () => {
            let modelExecutorFromCreator: ModelExecutor<any>;
            beforeAll(() => {
                modelExecutorFromCreator = getModelExecutor(
                    testCollectionPrefix,
                    refNameCreator =>
                        new Schema({
                            name: String,
                            date: Date,
                            cars: { type: Schema.Types.ObjectId, ref: refNameCreator('cars') },
                        }),
                );
            });

            test('creating an executor contains model', () => {
                expect(modelExecutorFromCreator.model).not.toBeNull();
            });
        });

        test('mongoose collection name match standard format', () => {
            expect(model.collection.name).toBe(`${testCollectionPrefix}_reality-${testReality}`);
        });

        test('created model contains given schema', () => {
            const resultPaths = (modelExecutor.model(context).schema as any).paths;
            const firstPaths = (personSchema as any).paths;
            expect(resultPaths.name).toEqual(firstPaths.name);
            expect(resultPaths.age).toEqual(firstPaths.age);
        });

        test('working with clone of the schema, not the schema itself', () => {
            expect(model.schema).not.toBe(personSchema);
        });
    });

    describe('executor works on the model', () => {
        test('executes runs on model', () => {
            const executorJob = jest.fn();
            modelExecutor.execute(m => executorJob(m), context);

            expect(executorJob).toBeCalledWith(modelExecutor.model(context));
        });
    });
});
