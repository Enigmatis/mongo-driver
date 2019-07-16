import { Schema } from 'mongoose';

export const addFields = (schema: Schema) => {
    schema.add({
        creationDate: {
            type: Date,
            default: Date.now,
        },
        lastUpdateDate: Date,
        deleted: {
            type: Boolean,
            default: false,
        },
        createdBy: String,
        lastUpdatedBy: String,
        realityId: Number,
        dataVersion: Number,
    });
};
