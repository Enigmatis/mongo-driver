import { Document, HookNextFunction, Schema } from 'mongoose';
import { InnerModelType } from '../types';
import { getNextDataVersion } from './data-version-manager';

export const addDataVersionMiddleware = (schema: Schema) => {
    ['findOneAndUpdate', 'update', 'updateOne', 'save'].forEach(middleware => {
        schema.post(middleware, getDataVersionHandler());
    });

    ['updateMany', 'insertMany'].forEach(middleware => {
        schema.post(middleware, getDataVersionManyHandler());
    });
};

const getDataVersionHandler = () => {
    return async function dataVersionSetter(doc: InnerModelType<any>, next: () => void) {
        doc.dataVersion = await getNextDataVersion();
        next();
    };
};

const getDataVersionManyHandler = () => {
    return async function manyDataVersionSetter(docs: InnerModelType<any>, next: () => void) {
        const dataVersion = await getNextDataVersion();
        docs.forEach(setDataVersion);

        function setDataVersion(doc: any) {
            doc.dataVersion = dataVersion;
        }

        return next();
    };
};
