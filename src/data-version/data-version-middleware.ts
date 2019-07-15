import { Schema } from 'mongoose';
import { InnerModelType } from '../types';
import { getNextDataVersion } from './data-version-manager';

export const addDataVersionMiddleware = (schema: Schema) => {
    ['findOneAndUpdate', 'update', 'updateOne', 'updateMany', 'save', 'insertMany'].forEach(
        middleware => {
            schema.pre(middleware, getDataVersionHandler());
        },
    );
};

const getDataVersionHandler = () => {
    return async function dataVersionSetter(this: InnerModelType<any>, next: () => void) {
        this.dataVersion = await getNextDataVersion();
        next();
    };
};
