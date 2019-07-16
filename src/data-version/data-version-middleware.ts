import { HookNextFunction, Model, Schema } from 'mongoose';
import { InnerModelType } from '../types';
import { getNextDataVersion } from './data-version-manager';

export const addDataVersionMiddleware = (schema: Schema) => {
    ['findOneAndUpdate', 'update', 'updateOne', 'save'].forEach(middleware => {
        schema.pre(middleware, getDataVersionHandler());
    });

    ['updateMany', 'insertMany'].forEach(middleware => {
        schema.pre(middleware, getDataVersionManyHandler());
    });
};

const getDataVersionHandler = () => {
    return async function dataVersionSetter(
        this: InnerModelType<any>,
        next: () => HookNextFunction,
    ) {
        this.dataVersion = await getNextDataVersion();
        next();
    };
};

const getDataVersionManyHandler = () => {
    return async function manyDataVersionSetter(
        this: Model<any>,
        next: HookNextFunction,
        docs: any[],
    ) {
        const dataVersion = await getNextDataVersion();
        docs.forEach(setDataVersion);

        function setDataVersion(doc: any) {
            doc.dataVersion = dataVersion;
        }

        return next();
    };
};
