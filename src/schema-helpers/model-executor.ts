import { ExecutionResult, PolarisBaseContext } from '@enigmatis/utills';
import { Model } from 'mongoose';
import { getCurrentDataVersion } from '../data-version/data-version-manager';
import { InnerModelType, ModelCreator } from '../types';

export class ModelExecutor<T> {
    model: ModelCreator<T>;

    constructor(model: ModelCreator<T>) {
        this.model = model;
    }

    execute = async (
        executionJob: (model: Model<InnerModelType<T>>) => any,
        context: PolarisBaseContext,
    ): Promise<ExecutionResult> => {
        const executionResult: ExecutionResult = {
            result: await executionJob(this.model(context)),
            executionMetadata: {
                dataVersion: await getCurrentDataVersion(),
            },
        };

        return executionResult;
    };
}
