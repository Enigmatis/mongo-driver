import { Document, Model } from 'mongoose';
import { RepositoryModel } from './model-creator';

export declare type InnerModelType<T> = T & Document & RepositoryModel;
export declare type ModelCreator<T> = (realityId: number) => ModelType<T>;
export declare type ModelType<T> = Model<InnerModelType<T>>;
