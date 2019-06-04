import { QueryIrrelevantResult } from '@enigmatis/utills';
import { Model } from 'mongoose';
import { InnerModelType } from '../types';

export const QueryWithIrrelevant = async (
    model: Model<InnerModelType<any>>,
    result: any[],
    dataVersion: number | undefined,
): Promise<any> => {
    if (!dataVersion) {
        return result;
    }
    const irrelevant = await model.find(
        {
            _id: { $nin: result.map(x => x._id) },
            dataVersion: { $gt: dataVersion },
            deleted: { $in: [true, false] },
        },
        { _id: true },
    );

    return new QueryIrrelevantResult(result, irrelevant.map(x => x._id));
};
