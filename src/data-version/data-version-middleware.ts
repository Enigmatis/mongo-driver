import { PolarisRequestHeaders } from '@enigmatis/utills';
import { Schema } from 'mongoose';
import { InnerModelType } from '../types';
import { getNextDataVersion } from './data-version-manager';

export const addDataVersionMiddleware = (schema: Schema, headers: PolarisRequestHeaders) => {
    ['findOneAndUpdate', 'update', 'updateOne', 'updateMany', 'save', 'insertMany'].forEach(
        middleware => {
            schema.pre(middleware, getDataVersionHandler(headers));
        },
    );
};

const getDataVersionHandler = (headers: PolarisRequestHeaders) => {
    return async function dataVersionSetter(this: InnerModelType<any>, next: () => void) {
        this.dataVersion = await getNextDataVersion();
        next();
    };
};
