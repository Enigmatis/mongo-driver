import { QueryIrrResult } from '@enigmatis/utills';
import { Model } from 'mongoose';
import { InnerModelType } from '../../../mongo-driver/src/types';
import { RepositoryModel } from '../model-creator';

export const QueryWithIrrelevant = async(
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
            deleted: { $in: [true, false] },
            dataVersion: { $gt: dataVersion },
        },
        { _id: true },
    );

    return new QueryIrrResult(result, irrelevant.map(x => x._id));
};
