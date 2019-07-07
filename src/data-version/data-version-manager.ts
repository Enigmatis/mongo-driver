import { DataVersionModel } from './data-version-model';

export const getNextDataVersion = async (): Promise<number> => {
    const nextDataVersionResult = await DataVersionModel.findOneAndUpdate(
        {},
        { $inc: { dataVersion: 1 } },
        { new: true, upsert: true },
    );
    return nextDataVersionResult.dataVersion;
};

export const getCurrentDataVersion = async (): Promise<number | null> => {
    const dataVersionResult = await DataVersionModel.findOne();

    return dataVersionResult && dataVersionResult.dataVersion;
};
