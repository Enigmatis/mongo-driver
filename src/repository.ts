import { DocumentQuery, Model } from 'mongoose';
import { BasicModel, ModuleCreator } from './model';

export abstract class PolarisRepository<T extends BasicModel> {
    zeroModel: Model<T>;

    protected constructor(private modelCreator: ModuleCreator<T>) {
        this.zeroModel = this.modelCreator(0);
    }

    async findAll(reality: number, includeOperational?: boolean): Promise<T[]> {
        const requestedReality = this.modelCreator(reality);
        const work = [requestedReality.find()];
        if (includeOperational) {
            work.push(this.zeroModel.find());
        }
        return this.concatResults(...work);
    }

    private async concatResults(...work: Array<DocumentQuery<T[], T>>): Promise<T[]> {
        const results = await Promise.all(work as any);
        return Array.prototype.concat(...results);
    }
}
