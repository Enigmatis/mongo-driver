import { QueryIrrelevantResult } from '@enigmatis/utills';
import { Model } from 'mongoose';
import { InnerModelType } from '../../../mongo-driver/src/types';

export const QueryWithIrrelevant = async (
    model: Model<InnerModelType<any>>,
    result: any[],
    dataVersion: number | undefined,
): Promise<any> => {
    if (dataVersion === undefined) {
        return result;
    }
    const irrelevant = await model.find(
        {
            _id: { $nin: result.map(x => x._id) },
            dataVersion: { $gt: dataVersion },
        },
        { _id: true },
    );

    return new QueryIrrelevantResult(result, irrelevant.map(x => x._id));
};
