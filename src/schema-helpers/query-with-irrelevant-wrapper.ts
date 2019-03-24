import { QueryIrrResult } from '@enigmatis/utills';
import { Model } from 'mongoose';
import { InnerModelType } from '../../../mongo-driver/src/types';
import { RepositoryModel } from '../model-creator';

export const QueryWithIrrelevant = async <T extends RepositoryModel>(
    model: Model<InnerModelType<T>>,
    result: T[],
    dataVersion: number | undefined,
): Promise<QueryIrrResult> => {
    dataVersion = dataVersion || 0;
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
