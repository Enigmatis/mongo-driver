import { Document, model, Schema } from 'mongoose';

export interface DataVersion extends Document {
    dataVersion: number;
}

const DataVersionSchema: Schema = new Schema({
    dataVersion: { type: Number, required: true, default: 0 },
});

export const DataVersionModel = model<DataVersion>('DataVersion', DataVersionSchema, 'DataVersion');
