import {Field} from "../other/field";
import {InitialValue} from "./initial-value";

export default interface IFieldProvider<TInput> {
    field<TType extends keyof TInput>(name: TType, initial?: InitialValue): Field<TInput[TType]>;
}