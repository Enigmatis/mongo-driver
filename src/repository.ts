import { DocumentQuery, Model } from 'mongoose';
import { ModelCreator, RepositoryModel } from './model';

export abstract class PolarisRepository<T extends RepositoryModel> {
    zeroModel: Model<T>;

    protected constructor(private modelCreator: ModelCreator<T>) {
        this.zeroModel = this.modelCreator(0);
    }

    async findAll(reality: number, includeOperational?: boolean): Promise<T[]> {
        const requestedReality = this.modelCreator(reality);
        const queries = [requestedReality.find()];
        if (includeOperational) {
            queries.push(this.zeroModel.find());
        }
        return this.concatResults(...queries);
    }

    private async concatResults(...queries: Array<DocumentQuery<T[], T>>): Promise<T[]> {
        const results = await Promise.all(queries as any);
        return Array.prototype.concat(...results);
    }
}
