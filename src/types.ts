import { PolarisRequestHeaders } from '@enigmatis/utills';
import { Document, Model } from 'mongoose';
import { RepositoryModel } from './model-manager';

export declare type InnerModelType<T> = T & Document & RepositoryModel;
export declare type ModelCreator<T> = ({
    headers,
}: {
    headers: PolarisRequestHeaders;
}) => ModelType<T>;
export declare type ModelType<T> = Model<InnerModelType<T>>;
